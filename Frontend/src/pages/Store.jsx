import React, { useState, useEffect } from "react";
import "../styles/Store.css";
import { apiFetch } from "../config/apiConfig";

const formatImage = (imageData) => {
  if (!imageData) return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  let img = imageData.trim();
  if (img.includes("base64,")) {
    return `data:image/jpeg;base64,${img.split("base64,").pop()}`;
  }
  return img.startsWith("data:image/") ? img : `data:image/jpeg;base64,${img}`;
};

const Store = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [notification, setNotification] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const memberId = user.id || 1;

  const [checkoutForm, setCheckoutForm] = useState({
    deliveryAddress: "",
    deliveryPhone: user.phone || "",
    specialInstructions: "",
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch("/api/store/categories");
      if (data && data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchItems = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const data = await apiFetch(`/api/store/items?t=${timestamp}`);
      if (data && data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    let filtered = items;
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.Category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ItemName.toLowerCase().includes(lower) ||
          item.Description?.toLowerCase().includes(lower)
      );
    }
    return filtered;
  };

  const addToCart = (itemId, itemName, price) => {
    const product = items.find((item) => item.ItemID === itemId);
    if (!product || product.Quantity <= 0) {
      showNotification("This item is out of stock!", "error");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.ItemID === itemId);
      if (existing) {
        return prev.map(item => item.ItemID === itemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ItemID: itemId, ItemName: itemName, Price: price, ImageData: product.ImageData, quantity: 1 }];
    });
    showNotification(`Added ${itemName} to cart!`);
  };

  const updateCartItem = (itemId, quantity) => {
    if (quantity < 1) {
      setCart(cart.filter(i => i.ItemID !== itemId));
      return;
    }
    const product = items.find(i => i.ItemID === itemId);
    if (product && quantity > product.Quantity) {
      showNotification(`Only ${product.Quantity} units available.`, "error");
      return;
    }
    setCart(cart.map(i => i.ItemID === itemId ? { ...i, quantity } : i));
  };

  const calculateCartTotals = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
    return { totalItems, totalPrice };
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!checkoutForm.deliveryAddress.trim() || !checkoutForm.deliveryPhone.trim()) {
      showNotification("Please fill delivery details", "error");
      return;
    }

    try {
      setLoading(true);
      const { totalPrice } = calculateCartTotals();
      const orderPayload = {
        MemberID: memberId,
        MemberName: user.name || "Member",
        TotalAmount: totalPrice,
        Status: "Pending",
        Items: cart.map(item => ({
          ItemID: item.ItemID,
          ItemName: item.ItemName,
          Quantity: item.quantity,
          Price: item.Price,
          Subtotal: item.Price * item.quantity,
        })),
        DeliveryAddress: checkoutForm.deliveryAddress,
        DeliveryPhone: checkoutForm.deliveryPhone,
        Notes: checkoutForm.specialInstructions,
      };

      const result = await apiFetch("/api/store/orders", {
        method: "POST",
        body: orderPayload,
      });

      if (result && result.success) {
        showNotification("Order placed successfully!");
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
        fetchItems(true);
      }
    } catch (error) {
      showNotification("Order failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const { totalItems, totalPrice } = calculateCartTotals();

  return (
    <div className="store-view">
      {notification && (
        <div className={`store-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Modern Search & Filters */}
      <div className="store-header-fixed">
        <div className="location-bar">
          <div className="brand-group">
            <h1 className="hindi-store-title">सत्संग स्टोर</h1>
          </div>
        </div>

        <div className="search-container">
          <div className="search-inner">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <input 
              type="text" 
              placeholder="Search for groceries or snacks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="categories-pills">
          <button 
            className={`pill ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            ALL ITEMS
          </button>
          {(categories.length > 0 
            ? categories.map(c => typeof c === 'string' ? c : c.CategoryName)
            : [...new Set(items.map(item => item.Category).filter(Boolean))]
          ).map(cat => (
            <button 
              key={cat}
              className={`pill ${selectedCategory?.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="store-content">
        {loading ? (
          <div className="store-loading">Loading items...</div>
        ) : getFilteredItems().length === 0 ? (
          <div className="store-empty">No items found</div>
        ) : (
          <div className="items-grid">
            {getFilteredItems().map(item => (
              <div key={item.ItemID} className="item-card">
                <div className="item-image-box">
                  <img src={formatImage(item.ImageData)} alt={item.ItemName} />
                  <div className="price-badge">₹{item.Price}</div>
                </div>
                <div className="item-details">
                  <h3 className="item-title">{item.ItemName}</h3>
                  <p className="item-subtitle">{item.Description || "Quality item"}</p>
                  <div className="stock-info">
                    {item.Quantity > 0 ? (
                      <span className="stock-count">
                        <span className="dot"></span> {item.Quantity} {item.Unit || "pcs"} available
                      </span>
                    ) : (
                      <span className="out-of-stock">Out of stock</span>
                    )}
                  </div>
                  <button 
                    className="add-btn"
                    onClick={() => addToCart(item.ItemID, item.ItemName, item.Price)}
                    disabled={item.Quantity <= 0}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item.Quantity > 0 ? "ADD TO CART" : "OUT OF STOCK"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <button className="floating-cart" onClick={() => setShowCart(true)}>
          <div className="cart-left">
            <div className="cart-count-badge">{totalItems}</div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2.5"/></svg>
          </div>
          <div className="cart-right">
            <span className="label">CART TOTAL</span>
            <span className="amount">₹{totalPrice.toLocaleString()}</span>
          </div>
        </button>
      )}

      {/* Bottom Navigation for Store */}
      <div className="store-bottom-nav">
        <div className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2"/></svg>
          <span>SATSANG</span>
        </div>
        <div className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2"/></svg>
          <span>CANTEEN</span>
        </div>
        <div className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeWidth="2"/></svg>
          <span>ALERTS</span>
        </div>
        <div className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="2"/></svg>
          <span>SETTINGS</span>
        </div>
      </div>

      {/* Cart Sidebar/Modal */}
      {showCart && (
        <div className="store-modal-overlay" onClick={() => setShowCart(false)}>
          <div className="store-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>My Cart</h2>
              <button onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div className="modal-body">
              {cart.map(item => {
                const stock = items.find(i => i.ItemID === item.ItemID)?.Quantity || 0;
                return (
                  <div key={item.ItemID} className="cart-list-item">
                    <div className="cart-item-image">
                      <img src={formatImage(item.ImageData)} alt={item.ItemName} />
                    </div>
                    <div className="info">
                      <h4>{item.ItemName}</h4>
                      <p>₹{item.Price} × {item.quantity}</p>
                      <span className="cart-stock-hint">Available: {stock}</span>
                    </div>
                    <div className="controls">
                      <button onClick={() => updateCartItem(item.ItemID, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.ItemID, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <div className="total">Total: ₹{totalPrice}</div>
              <button className="checkout-btn" onClick={() => setShowCheckout(true)}>Checkout</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="store-modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="store-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Checkout</h2>
              <button onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="order-summary-box">
                <h3>Order Summary</h3>
                {cart.map(item => (
                  <div key={item.ItemID} className="summary-item">
                    <span>{item.ItemName} × {item.quantity}</span>
                    <span>₹{item.Price * item.quantity}</span>
                  </div>
                ))}
                <div className="summary-total-line">
                  <span>To Pay</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>

              <form onSubmit={placeOrder} className="modern-checkout-form">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input type="text" value={user.name || "Member"} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="Phone number for delivery" 
                    value={checkoutForm.deliveryPhone}
                    onChange={e => setCheckoutForm({...checkoutForm, deliveryPhone: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea 
                    placeholder="Enter complete address" 
                    value={checkoutForm.deliveryAddress}
                    onChange={e => setCheckoutForm({...checkoutForm, deliveryAddress: e.target.value})}
                    required 
                  />
                </div>

                <div className="cod-notice-card">
                  <div className="icon">💵</div>
                  <div className="details">
                    <strong>Cash on Delivery (COD) Only</strong>
                    <p>No GPay / Online payments accepted</p>
                  </div>
                </div>

                <button type="submit" className="place-btn-final" disabled={loading}>
                  {loading ? "Placing Order..." : "PLACE ORDER NOW"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;
