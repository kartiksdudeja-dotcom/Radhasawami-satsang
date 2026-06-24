import React, { useState, useEffect } from "react";
import "../styles/StoreAdmin.css";
import { API_BASE_URL, getAuthHeaders, apiFetch } from "../config/apiConfig";

const formatImage = (imageData) => {
  if (!imageData) return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  let img = imageData.trim();

  // 🔥 Extract ONLY last valid base64 part
  if (img.includes("base64,")) {
    const cleanBase64 = img.split("base64,").pop();
    return `data:image/jpeg;base64,${cleanBase64}`;
  }

  // Already correct
  if (img.startsWith("data:image/")) {
    return img;
  }

  // Raw base64
  return `data:image/jpeg;base64,${img}`;
};

const StoreAdmin = ({ user: propUser }) => {
  const user = propUser || JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryItems, setCategoryItems] = useState([]);
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryDetail, setShowCategoryDetail] = useState(false);
  const [notification, setNotification] = useState(null);
  const [itemImage, setItemImage] = useState(null);
  const [itemImagePreview, setItemImagePreview] = useState(null);
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState(null);

  // Search states
  const [itemSearch, setItemSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  // Form states
  const [itemForm, setItemForm] = useState({
    ItemName: "",
    Description: "",
    Category: "",
    Price: "",
    Quantity: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    CategoryName: "",
    Description: "",
    CategoryIcon: "📦",
  });

  useEffect(() => {
    fetchItems();
    fetchOrders();
    fetchSales();
    fetchCategories();

    // ✅ AUTO-SYNC: Refresh data every 30 seconds silently
    const syncInterval = setInterval(() => {
      fetchItems(true);
      fetchOrders();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchItems = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const timestamp = new Date().getTime();
      const data = await apiFetch(`/api/store/items?t=${timestamp}`);

      if (data && data.success && Array.isArray(data.data)) {
        setItems(data.data);
        console.log(`📦 Admin: Fetched ${data.data.length} items from server`);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      showNotification("Failed to load items", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchOrders = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const timestamp = new Date().getTime();
      const data = await apiFetch(`/api/store/orders?t=${timestamp}`);

      if (data && data.success && Array.isArray(data.data)) {
        // Deduplicate orders by OrderID
        const uniqueOrdersMap = {};
        data.data.forEach((order) => {
          if (
            !uniqueOrdersMap[order.OrderID] ||
            !uniqueOrdersMap[order.OrderID].Items ||
            uniqueOrdersMap[order.OrderID].Items.length === 0
          ) {
            uniqueOrdersMap[order.OrderID] = order;
          }
        });

        const uniqueOrders = Object.values(uniqueOrdersMap);
        setOrders(uniqueOrders);
        console.log(`✅ Loaded ${uniqueOrders.length} unique orders`);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchSales = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await apiFetch("/api/store/sales");

      if (data && data.success && Array.isArray(data.data)) {
        // Remove duplicates if any
        const uniqueSales = [];
        const seenSaleIds = new Set();
        for (const sale of data.data) {
          if (sale.SaleID && !seenSaleIds.has(sale.SaleID)) {
            uniqueSales.push(sale);
            seenSaleIds.add(sale.SaleID);
          }
        }
        setSales(uniqueSales);
        console.log(`✅ Loaded ${uniqueSales.length} unique sales`);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch categories from database
      const data = await apiFetch("/api/store/categories");

      if (data && data.success && Array.isArray(data.data)) {
        setCategories(data.data);
        console.log(`✅ Loaded ${data.data.length} categories from database`);
      } else {
        // Fallback: Get unique categories from items if API fails
        const uniqueCategories = {};
        items.forEach((item) => {
          if (item.Category && !uniqueCategories[item.Category]) {
            uniqueCategories[item.Category] = {
              CategoryName: item.Category,
              ItemCount: 1,
              Icon: "📦",
            };
          } else if (item.Category) {
            uniqueCategories[item.Category].ItemCount += 1;
          }
        });
        setCategories(Object.values(uniqueCategories));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Item CRUD
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editItem
        ? `/api/store/items/${editItem.ItemID}`
        : "/api/store/items";
      const method = editItem ? "PUT" : "POST";

      // Handle new category creation
      let categoryName = itemForm.Category;
      if (itemForm.Category === "__new__" && itemForm.NewCategory) {
        categoryName = itemForm.NewCategory;
        // Create the new category first
        try {
          await apiFetch("/api/store/categories", {
            method: "POST",
            body: {
              CategoryName: categoryName,
              CategoryIcon: "📦",
              Description: "",
            },
          });
          fetchCategories(); // Refresh categories list
        } catch (err) {
          console.log("Category might already exist:", err);
        }
      }

      // Prepare payload with image
      const payload = {
        ...itemForm,
        Category: categoryName,
        Price: parseFloat(itemForm.Price),
        Quantity: parseInt(itemForm.Quantity) || 0,
      };
      delete payload.NewCategory; // Remove helper field

      // Add image data if it exists (correctly extract raw base64)
      if (itemImage) {
        const base64Data = itemImage.includes("base64,") ? itemImage.split("base64,").pop() : itemImage;
        payload.ImageData = base64Data;
        console.log("📸 Uploading item with image:", payload.ItemName);
      }

      const data = await apiFetch(url, {
        method,
        body: payload,
      });

      if (data && data.success) {
        showNotification(editItem ? "✓ Item updated!" : "✓ Item created!");
        fetchItems();
        closeModal();
      } else if (data) {
        showNotification(data.error || "Failed to save item", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to save item: " + error.message, "error");
    }
  };

  const deleteStoreItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const result = await apiFetch(`/api/store/items/${id}`, {
        method: "DELETE",
      });
      if (result && result.success) {
        showNotification("✓ Item deleted!");
        fetchItems();
      }
    } catch (error) {
      showNotification("Failed to delete item", "error");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const order = orders.find((o) => o.OrderID === orderId);

      const result = await apiFetch(
        `/api/store/orders/${orderId}/status`,
        {
          method: "PUT",
          body: { Status: status },
        },
      );

      if (result && result.success) {
        showNotification("✓ Order status updated!");

        // Send notification to member if order is Ready
        if (status === "Ready") {
          await sendOrderNotification(orderId, order?.MemberName, "ready");
        }

        // If order is Delivered, create a sales record
        if (status === "Delivered") {
          await sendOrderNotification(orderId, order?.MemberName, "delivered");

          // Create sales record
          if (order && order.Items && order.Items.length > 0) {
            try {
              const saleData = {
                OrderID: orderId,
                MemberID: order.MemberID,
                MemberName: order.MemberName,
                TotalAmount: order.TotalAmount,
                Items: order.Items,
                SaleDate: new Date().toISOString(),
              };

              const result = await apiFetch("/api/store/sales", {
                method: "POST",
                body: saleData,
              });

              if (result && result.success) {
                console.log("✓ Sales record created for delivered order");
                await fetchSales();
              }
            } catch (error) {
              console.error("Error creating sales record:", error);
            }
          }
        }

        fetchOrders();
      }
    } catch (error) {
      showNotification("Failed to update order status", "error");
    }
  };

  const deleteOrderHandler = async (orderId) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Order #${orderId}? This will restore inventory quantities.`,
      )
    ) {
      return;
    }

    try {
      // First remove from UI immediately for better UX
      const updatedOrders = orders.filter((order) => order.OrderID !== orderId);
      setOrders(updatedOrders);

      const result = await apiFetch(
        `/api/store/orders/${orderId}`,
        {
          method: "DELETE",
        },
      );

      if (result && result.success) {
        showNotification(
          "✓ Order deleted successfully and inventory restored!",
        );
        // Refresh from database to confirm deletion
        fetchOrders();
      } else {
        showNotification("Failed to delete order", "error");
        // Restore order if delete failed
        fetchOrders();
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      showNotification("Failed to delete order", "error");
      // Restore order if delete failed
      fetchOrders();
    }
  };

  const deleteSaleHandler = async (saleId) => {
    if (!window.confirm(`Are you sure you want to delete Sale #${saleId}?`)) {
      return;
    }

    try {
      const result = await apiFetch(
        `/api/store/sales/${saleId}`,
        {
          method: "DELETE",
        },
      );

      if (result && result.success) {
        showNotification("✓ Sale deleted successfully!");
        fetchSales();
      } else if (result) {
        showNotification("Failed to delete sale", "error");
      }
    } catch (error) {
      showNotification("Failed to delete sale", "error");
    }
  };

  const editOrderHandler = (order) => {
    setEditOrder(order);
    setModalType("editOrder");
    setShowModal(true);
  };

  const submitEditOrder = async (e) => {
    e.preventDefault();
    if (!editOrder?.Status) {
      showNotification("Please select a status", "error");
      return;
    }

    try {
      const result = await apiFetch(
        `/api/store/orders/${editOrder.OrderID}/status`,
        {
          method: "PUT",
          body: { Status: editOrder.Status },
        },
      );

      if (result && result.success) {
        showNotification("✓ Order status updated successfully!");
        setShowModal(false);
        setEditOrder(null);
        fetchOrders();
      } else {
        showNotification("Failed to update order status", "error");
      }
    } catch (error) {
      showNotification("Failed to update order status", "error");
    }
  };

  // Category Handlers
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditCategory(category);
      setCategoryForm({
        CategoryName: category.CategoryName,
        Description: category.Description || "",
        CategoryIcon: category.Icon || "📦",
      });
    } else {
      setEditCategory(null);
      setCategoryForm({
        CategoryName: "",
        Description: "",
        CategoryIcon: "📦",
      });
    }
    setModalType("category");
    setShowModal(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.CategoryName.trim()) {
      showNotification("Category name is required", "error");
      return;
    }

    try {
      // Save to database
      const result = await apiFetch("/api/store/categories", {
        method: "POST",
        body: {
          CategoryName: categoryForm.CategoryName,
          Description: categoryForm.Description,
          CategoryIcon: categoryForm.CategoryIcon,
        },
      });

      if (result && result.success) {
        showNotification(
          `✓ Category "${categoryForm.CategoryName}" saved successfully!`,
        );
        setShowModal(false);
        setCategoryForm({
          CategoryName: "",
          Description: "",
          CategoryIcon: "📦",
        });
        setEditCategory(null);
        // Refresh categories from database
        await fetchCategories();
      } else if (result) {
        showNotification(result.error || "Failed to save category", "error");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      showNotification("Failed to save category", "error");
    }
  };

  const deleteCategoryHandler = async (categoryId, categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }
    try {
      const result = await apiFetch(
        `/api/store/categories/${categoryId}`,
        {
          method: "DELETE",
        },
      );
      if (result && result.success) {
        setCategories(
          categories.filter((cat) => cat.CategoryID !== categoryId),
        );
        showNotification(`✓ Category "${categoryName}" deleted!`);
      } else if (result) {
        showNotification("Failed to delete category", "error");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotification("Failed to delete category", "error");
    }
  };

  // View category details and manage items
  const viewCategoryDetails = async (category) => {
    setSelectedCategory(category);
    setShowCategoryDetail(true);
    try {
      const result = await apiFetch(
        `/api/store/categories/${category.CategoryID}/items`,
      );

      if (result && result.success && Array.isArray(result.data)) {
        setCategoryItems(result.data);
        console.log(
          `✅ Loaded ${result.data.length} items for category "${category.CategoryName}"`,
        );
      }
    } catch (error) {
      console.error("Error fetching category items:", error);
      setCategoryItems([]);
    }
  };

  // Add item to category
  const addItemToCategory = async (itemId, categoryId) => {
    try {
      const result = await apiFetch(
        "/api/store/categories/items/add",
        {
          method: "POST",
          body: { ItemID: itemId, CategoryID: categoryId },
        },
      );
      if (result && result.success) {
        showNotification("✓ Item added to category!");
      } else if (result) {
        showNotification(result.message || "Failed to add item", "error");
      }
    } catch (error) {
      showNotification("Failed to add item to category", "error");
    }
  };

  // Remove item from category
  const removeItemFromCategory = async (itemId, categoryId) => {
    try {
      const result = await apiFetch(
        "/api/store/categories/items/remove",
        {
          method: "POST",
          body: { ItemID: itemId, CategoryID: categoryId },
        },
      );
      if (result && result.success) {
        showNotification("✓ Item removed from category!");
      }
    } catch (error) {
      showNotification("Failed to remove item", "error");
    }
  };

  const sendOrderNotification = async (orderId, memberName, type) => {
    try {
      const messages = {
        ready: `✅ Your order is ready! Please pick up your order from the store.`,
        delivered: `🎉 Your order has been delivered!`,
      };

      const result = await apiFetch("/api/notifications", {
        method: "POST",
        body: {
          message: messages[type],
          type: "order_" + type,
          orderId: orderId,
          memberName: memberName,
          is_admin: true,
        },
      });

      if (result && result.success) {
        console.log(`📢 Notification sent to ${memberName}`);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditItem(item);
    setItemImage(null);
    setItemImagePreview(null);

    if (type === "item") {
      setItemForm(
        item
          ? {
              ItemName: item.ItemName,
              Description: item.Description || "",
              Category: item.Category || "",
              Price: item.Price,
              Quantity: item.Quantity || 0,
            }
          : {
              ItemName: "",
              Description: "",
              Category: "",
              Price: "",
              Quantity: "",
            },
      );

      if (item?.ImageData) {
        // Only add prefix if not already present
        const imageUrl = item.ImageData.startsWith("data:")
          ? item.ImageData
          : `data:image/jpeg;base64,${item.ImageData}`;
        setItemImagePreview(imageUrl);
      }
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setEditItem(null);
    setItemImage(null);
    setItemImagePreview(null);
  };

  // Image handling functions
  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleCameraCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const compressImage = (base64String) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64String;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Max dimensions
        let width = img.width;
        let height = img.height;
        const maxWidth = 800;
        const maxHeight = 800;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Compress with quality setting
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };

      img.onerror = () => {
        resolve(base64String); // Return original if compression fails
      };
    });
  };

  const processImageFile = async (file) => {
    if (!file.type.startsWith("image/")) {
      showNotification("Please select an image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Compress the image before storing
        const compressedImage = await compressImage(event.target.result);
        setItemImagePreview(compressedImage);
        setItemImage(compressedImage);
        showNotification("✓ Image added (compressed)");
      } catch (error) {
        console.error("Error processing image:", error);
        showNotification("Error processing image", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setItemImage(null);
    setItemImagePreview(null);
    showNotification("Image removed");
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: "#f59e0b",
      Confirmed: "#3b82f6",
      Ready: "#10b981",
      Delivered: "#22c55e",
      Cancelled: "#ef4444",
      Completed: "#22c55e",
    };
    return colors[status] || "#64748b";
  };

  // Calculate stats
  const stats = {
    totalItems: items.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.Status === "Pending").length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.TotalAmount || 0), 0),
  };

  return (
    <div className="store-admin-container">
      {/* Notification */}
      {notification && (
        <div className={`admin-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="admin-header">
        <div className="admin-header-title">
          <h1>🏪 Store Management</h1>
          <p>Manage items, orders and sales</p>
        </div>
        <button
          className="admin-refresh-btn"
          onClick={() => {
            fetchItems();
            fetchOrders();
            fetchSales();
            showNotification("✓ Data refreshed successfully", "success");
          }}
          title="Sync now"
        >
          🔄 Sync Now
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === "items" ? "active" : ""}
          onClick={() => setActiveTab("items")}
        >
          📦 Items
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          🛒 Orders
        </button>
        <button
          className={activeTab === "inventory" ? "active" : ""}
          onClick={() => setActiveTab("inventory")}
        >
          📊 Inventory
        </button>
        <button
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          💳 Sales
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="admin-dashboard">
          <div className="stats-grid">
            <div className="stat-card blue">
              <span className="stat-icon">📦</span>
              <div className="stat-info">
                <h3>{stats.totalItems}</h3>
                <p>Total Items</p>
              </div>
            </div>
            <div className="stat-card purple">
              <span className="stat-icon">🛒</span>
              <div className="stat-info">
                <h3>{stats.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stat-card orange">
              <span className="stat-icon">⏳</span>
              <div className="stat-info">
                <h3>{stats.pendingOrders}</h3>
                <p>Pending Orders</p>
              </div>
            </div>
            <div className="stat-card teal">
              <span className="stat-icon">💰</span>
              <div className="stat-info">
                <h3>₹{stats.totalRevenue?.toLocaleString() || 0}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === "items" && (
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2>📦 Store Items</h2>
              <div className="search-bar-mini">
                <input
                  type="text"
                  placeholder="🔍 Search items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </div>
            <button className="add-btn" onClick={() => openModal("item")}>
              + Add Item
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="data-table items-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(
                    (item) =>
                      item.ItemName?.toLowerCase().includes(
                        itemSearch.toLowerCase(),
                      ) ||
                      item.Category?.toLowerCase().includes(
                        itemSearch.toLowerCase(),
                      ),
                  )
                  .map((item) => (
                    <tr key={item.ItemID}>
                      <td>{item.ItemID}</td>
                      <td>
                        <img
                          src={formatImage(item.ImageData)}
                          alt={item.ItemName}
                          className="table-thumbnail"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "inline";
                          }}
                        />
                        <span className="no-image" style={{ display: "none" }}>
                          📸
                        </span>
                      </td>
                      <td>{item.ItemName}</td>
                      <td>{item.Category}</td>
                      <td>₹{item.Price}</td>
                      <td>
                        {item.Quantity} {item.Unit}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="edit-btn"
                          onClick={() => openModal("item", item)}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => deleteStoreItem(item.ItemID)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="items-cards-container items-table-mobile">
            {items.length > 0 ? (
              items
                .filter(
                  (item) =>
                    item.ItemName?.toLowerCase().includes(
                      itemSearch.toLowerCase(),
                    ) ||
                    item.Category?.toLowerCase().includes(
                      itemSearch.toLowerCase(),
                    ),
                )
                .map((item) => (
                  <div className="item-card" key={item.ItemID}>
                    <div className="item-card-header">
                      <div className="item-image-wrapper">
                        {item.ImageData ? (
                          <img
                            src={formatImage(item.ImageData)}
                            alt={item.ItemName}
                            className="item-card-image"
                          />
                        ) : (
                          <span className="item-card-no-image">📸</span>
                        )}
                      </div>
                      <div className="item-header-info">
                        <h3>{item.ItemName}</h3>
                        <span className="item-id">ID: {item.ItemID}</span>
                      </div>
                    </div>

                    <div className="item-card-body">
                      <div className="item-field">
                        <label>🏷️ Category</label>
                        <span>{item.Category}</span>
                      </div>
                      <div className="item-field">
                        <label>💰 Price</label>
                        <span>₹{item.Price}</span>
                      </div>
                      <div className="item-field">
                        <label>📊 Quantity</label>
                        <span>
                          {item.Quantity} {item.Unit || "Unit"}
                        </span>
                      </div>
                    </div>

                    <div className="item-card-actions">
                      <button
                        className="edit-btn-card"
                        onClick={() => openModal("item", item)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn-card"
                        onClick={() => deleteStoreItem(item.ItemID)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="no-orders-card">No items found</div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2>Orders Management</h2>
              <div className="search-bar-mini">
                <input
                  type="text"
                  placeholder="🔍 Search orders by member..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
            </div>
            <p className="section-subtitle">
              View and manage all customer orders
            </p>
          </div>

          {/* Desktop Table Layout */}
          <div className="data-table orders-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Member Name</th>
                  <th>Products</th>
                  <th>Quantities</th>
                  <th>Total Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders
                    .filter(
                      (order) =>
                        order.MemberName?.toLowerCase().includes(
                          orderSearch.toLowerCase(),
                        ) || order.OrderID?.toString().includes(orderSearch),
                    )
                    .map((order) => {
                      const orderItems = order.Items || [];
                      const productNames =
                        orderItems
                          .map((item) => item.ItemName || item.Product || "N/A")
                          .join(", ") || "N/A";
                      const quantities =
                        orderItems
                          .map((item) => `${item.Quantity}`)
                          .join(", ") || "N/A";

                      return (
                        <tr key={order.OrderID}>
                          <td>{order.OrderID}</td>
                          <td>
                            {order.MemberName || `Member ${order.MemberID}`}
                          </td>
                          <td>{productNames}</td>
                          <td>{quantities}</td>
                          <td className="amount">
                            ₹{parseFloat(order.TotalAmount).toFixed(2)}
                          </td>
                          <td>
                            {order.OrderDate
                              ? new Date(order.OrderDate).toLocaleString()
                              : "N/A"}
                          </td>
                          <td>
                            <select
                              value={order.Status || "Pending"}
                              onChange={(e) =>
                                updateOrderStatus(order.OrderID, e.target.value)
                              }
                              className="status-select"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Ready">Ready</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="actions-cell">
                            <button
                              className="edit-btn"
                              onClick={() => editOrderHandler(order)}
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => deleteOrderHandler(order.OrderID)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="orders-cards-container orders-table-mobile">
            {orders.length > 0 ? (
              orders
                .filter(
                  (order) =>
                    order.MemberName?.toLowerCase().includes(
                      orderSearch.toLowerCase(),
                    ) || order.OrderID?.toString().includes(orderSearch),
                )
                .map((order) => {
                  const orderItems = order.Items || [];
                  const productNames =
                    orderItems
                      .map((item) => item.ItemName || item.Product || "N/A")
                      .join(", ") || "N/A";
                  const quantities =
                    orderItems.map((item) => `${item.Quantity}`).join(", ") ||
                    "N/A";

                  return (
                    <div className="order-card" key={order.OrderID}>
                      <div className="order-card-header">
                        <span className="order-id">Order #{order.OrderID}</span>
                        <span
                          className={`order-status-badge ${(order.Status || "Pending").toLowerCase()}`}
                        >
                          {order.Status || "Pending"}
                        </span>
                      </div>

                      <div className="order-card-body">
                        <div className="order-field">
                          <label>👤 Member</label>
                          <span>
                            {order.MemberName || `Member ${order.MemberID}`}
                          </span>
                        </div>
                        <div className="order-field">
                          <label>📦 Products</label>
                          <span>{productNames}</span>
                        </div>
                        <div className="order-field">
                          <label>🔢 Quantities</label>
                          <span>{quantities}</span>
                        </div>
                        <div className="order-field">
                          <label>💰 Amount</label>
                          <span className="amount">
                            ₹{parseFloat(order.TotalAmount).toFixed(2)}
                          </span>
                        </div>
                        <div className="order-field">
                          <label>📅 Date</label>
                          <span>
                            {order.OrderDate
                              ? new Date(order.OrderDate).toLocaleString()
                              : "N/A"}
                          </span>
                        </div>
                        <div className="order-field">
                          <label>📋 Status</label>
                          <select
                            value={order.Status || "Pending"}
                            onChange={(e) =>
                              updateOrderStatus(order.OrderID, e.target.value)
                            }
                            className="status-select-card"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Ready">Ready</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div className="order-card-actions">
                        <button
                          className="edit-btn-card"
                          onClick={() => editOrderHandler(order)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="delete-btn-card"
                          onClick={() => deleteOrderHandler(order.OrderID)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="no-orders-card">No orders found</div>
            )}
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2>💳 Sales History</h2>
              <div className="search-bar-mini">
                <input
                  type="text"
                  placeholder="🔍 Search sales by item/member..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                />
              </div>
            </div>
            <p className="section-subtitle">
              View all completed sales transactions
            </p>
          </div>

          {/* Desktop Table Layout */}
          <div className="data-table sales-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Item Name</th>
                  <th>Member Name</th>
                  <th>Quantity</th>
                  <th>Total Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales
                    .filter(
                      (sale) =>
                        sale.ItemName?.toLowerCase().includes(
                          salesSearch.toLowerCase(),
                        ) ||
                        sale.MemberName?.toLowerCase().includes(
                          salesSearch.toLowerCase(),
                        ) ||
                        sale.SaleID?.toString().includes(salesSearch),
                    )
                    .map((sale) => (
                      <tr key={sale.SaleID}>
                        <td>{sale.SaleID}</td>
                        <td>{sale.ItemName || `Item ${sale.ItemID}`}</td>
                        <td>{sale.MemberName || `Member ${sale.MemberID}`}</td>
                        <td>{sale.Quantity}</td>
                        <td className="amount">₹{sale.TotalAmount}</td>
                        <td>
                          {sale.SaleDate
                            ? new Date(sale.SaleDate).toLocaleString()
                            : "N/A"}
                        </td>
                        <td className="actions-cell">
                          <button
                            className="delete-btn"
                            onClick={() => deleteSaleHandler(sale.SaleID)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No sales found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sales-cards-container sales-table-mobile">
            {sales.length > 0 ? (
              sales
                .filter(
                  (sale) =>
                    sale.ItemName?.toLowerCase().includes(
                      salesSearch.toLowerCase(),
                    ) ||
                    sale.MemberName?.toLowerCase().includes(
                      salesSearch.toLowerCase(),
                    ) ||
                    sale.SaleID?.toString().includes(salesSearch),
                )
                .map((sale) => (
                  <div className="sale-card" key={sale.SaleID}>
                    <div className="sale-card-header">
                      <span className="sale-id">Sale #{sale.SaleID}</span>
                      <span className="sale-date">
                        {sale.SaleDate
                          ? new Date(sale.SaleDate).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>

                    <div className="sale-card-body">
                      <div className="sale-field">
                        <label>📦 Item</label>
                        <span>{sale.ItemName || `Item ${sale.ItemID}`}</span>
                      </div>
                      <div className="sale-field">
                        <label>👤 Member</label>
                        <span>
                          {sale.MemberName || `Member ${sale.MemberID}`}
                        </span>
                      </div>
                      <div className="sale-field">
                        <label>🔢 Quantity</label>
                        <span>{sale.Quantity}</span>
                      </div>
                      <div className="sale-field">
                        <label>💰 Amount</label>
                        <span className="amount">₹{sale.TotalAmount}</span>
                      </div>
                    </div>

                    <div className="sale-card-actions">
                      <button
                        className="delete-btn-card"
                        onClick={() => deleteSaleHandler(sale.SaleID)}
                      >
                        🗑️ Delete Sale
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="no-orders-card">No sales found</div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2>📊 Current Inventory</h2>
              <div className="search-bar-mini">
                <input
                  type="text"
                  placeholder="🔍 Search inventory..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>
            </div>
            <p className="section-subtitle">
              Monitor all store item quantities and stock levels
            </p>
          </div>
          <div className="inventory-stats">
            <div className="inventory-stat-card">
              <span className="stat-number">{items.length}</span>
              <span className="stat-label">Total Items</span>
            </div>
            <div className="inventory-stat-card">
              <span className="stat-number">
                {items.reduce((sum, item) => sum + (item.Quantity || 0), 0)}
              </span>
              <span className="stat-label">Total Units in Stock</span>
            </div>
            <div className="inventory-stat-card low-stock">
              <span className="stat-number">
                {items.filter((item) => (item.Quantity || 0) < 5).length}
              </span>
              <span className="stat-label">Low Stock Items</span>
            </div>
            <div className="inventory-stat-card">
              <span className="stat-number">
                ₹
                {items
                  .reduce(
                    (sum, item) => sum + (item.Price * item.Quantity || 0),
                    0,
                  )
                  .toFixed(2)}
              </span>
              <span className="stat-label">Total Inventory Value</span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="data-table inventory-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Quantity in Stock</th>
                  <th>Stock Status</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items
                    .filter(
                      (item) =>
                        item.ItemName?.toLowerCase().includes(
                          inventorySearch.toLowerCase(),
                        ) ||
                        item.Category?.toLowerCase().includes(
                          inventorySearch.toLowerCase(),
                        ),
                    )
                    .map((item) => {
                      const qty = item.Quantity || 0;
                      const stockStatus =
                        qty === 0
                          ? "Out of Stock"
                          : qty < 5
                            ? "Low Stock"
                            : "In Stock";
                      const statusColor =
                        qty === 0 ? "red" : qty < 5 ? "orange" : "green";

                      return (
                        <tr key={item.ItemID}>
                          <td className="item-name">{item.ItemName}</td>
                          <td>{item.Category || "N/A"}</td>
                          <td className="price">
                            ₹{parseFloat(item.Price).toFixed(2)}
                          </td>
                          <td className="quantity">
                            <span className="qty-badge">
                              {qty} {item.Unit || "Unit"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${statusColor}`}>
                              {stockStatus}
                            </span>
                          </td>
                          <td className="total-value">
                            ₹{(item.Price * qty).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No items in inventory
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="inventory-cards-container inventory-table-mobile">
            {items.length > 0 ? (
              items
                .filter(
                  (item) =>
                    item.ItemName?.toLowerCase().includes(
                      inventorySearch.toLowerCase(),
                    ) ||
                    item.Category?.toLowerCase().includes(
                      inventorySearch.toLowerCase(),
                    ),
                )
                .map((item) => {
                  const qty = item.Quantity || 0;
                  const stockStatus =
                    qty === 0
                      ? "Out of Stock"
                      : qty < 5
                        ? "Low Stock"
                        : "In Stock";
                  const statusColor =
                    qty === 0
                      ? "out-of-stock"
                      : qty < 5
                        ? "low-stock"
                        : "in-stock";

                  return (
                    <div className="inventory-card" key={item.ItemID}>
                      <div className="inventory-card-header">
                        <div className="inventory-header-info">
                          <h3>{item.ItemName}</h3>
                          <span className="inventory-id">
                            ID: {item.ItemID}
                          </span>
                        </div>
                        <span
                          className={`inventory-status-badge ${statusColor}`}
                        >
                          {stockStatus}
                        </span>
                      </div>

                      <div className="inventory-card-body">
                        <div className="inventory-field">
                          <label>🏷️ Category</label>
                          <span>{item.Category || "N/A"}</span>
                        </div>
                        <div className="inventory-field">
                          <label>💰 Unit Price</label>
                          <span>₹{parseFloat(item.Price).toFixed(2)}</span>
                        </div>
                        <div className="inventory-field">
                          <label>📦 Quantity in Stock</label>
                          <span className="quantity-highlight">
                            {qty} {item.Unit || "Unit"}
                          </span>
                        </div>
                        <div className="inventory-field">
                          <label>💵 Total Value</label>
                          <span className="value-highlight">
                            ₹{(item.Price * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="inventory-card-actions">
                        <button
                          className="edit-btn-card"
                          onClick={() => openModal("item", item)}
                        >
                          ✏️ Edit Item
                        </button>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="no-orders-card">No items in inventory</div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === "item"
                  ? editItem
                    ? "Edit Item"
                    : "Add New Item"
                  : ""}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>
            {modalType === "item" && (
              <form onSubmit={handleItemSubmit} className="modal-form">
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    value={itemForm.ItemName}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, ItemName: e.target.value })
                    }
                    required
                    placeholder="Enter item name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={itemForm.Description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, Description: e.target.value })
                    }
                    placeholder="Enter description"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={itemForm.Category}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, Category: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.CategoryID} value={cat.CategoryName}>
                        {cat.CategoryIcon || "📦"} {cat.CategoryName}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Category</option>
                  </select>
                  {itemForm.Category === "__new__" && (
                    <input
                      type="text"
                      value={itemForm.NewCategory || ""}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          NewCategory: e.target.value,
                        })
                      }
                      placeholder="Enter new category name"
                      style={{ marginTop: "8px" }}
                    />
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      value={itemForm.Price}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, Price: e.target.value })
                      }
                      required
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      value={itemForm.Quantity}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, Quantity: e.target.value })
                      }
                      required
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="form-group">
                  <label>Item Image</label>
                  <div
                    className="image-upload-area"
                    onDrop={handleImageDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {itemImagePreview ? (
                      <div className="image-preview-container">
                        <img
                          src={formatImage(itemImagePreview)}
                          alt="Preview"
                          className="image-preview"
                        />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={removeImage}
                        >
                          ✕ Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <div className="upload-icon">📸</div>
                        <p>
                          Drag & drop an image here, or use the buttons below
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="image-upload-buttons">
                    <label className="file-upload-btn">
                      📁 Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                    <label className="camera-upload-btn">
                      📷 Take Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="submit" className="submit-btn">
                    Save Item
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {modalType === "editOrder" && editOrder && (
              <form onSubmit={submitEditOrder} className="modal-form">
                <div className="form-group">
                  <label>Order Number</label>
                  <input
                    type="text"
                    value={editOrder.OrderNumber || ""}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Member Name</label>
                  <input
                    type="text"
                    value={editOrder.MemberName || ""}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Branch</label>
                  <input
                    type="text"
                    value={editOrder.Branch || ""}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    value={editOrder.TotalAmount || ""}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Order Status *</label>
                  <select
                    value={editOrder.Status || ""}
                    onChange={(e) =>
                      setEditOrder({ ...editOrder, Status: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Ready">Ready</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {editOrder.Items && editOrder.Items.length > 0 && (
                  <div className="form-group">
                    <label>Order Items</label>
                    <div className="items-list">
                      {editOrder.Items.map((item, idx) => (
                        <div key={idx} className="item-row">
                          <span>{item.ItemName}</span>
                          <span>Qty: {item.Quantity}</span>
                          <span>₹{item.TotalPrice?.toFixed(2) || "0.00"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-footer">
                  <button type="submit" className="submit-btn">
                    Update Order Status
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {modalType === "category" && (
              <form onSubmit={handleCategorySubmit} className="modal-form">
                <div className="form-group">
                  <label>Category Icon</label>
                  <div className="icon-selector">
                    {[
                      "📦",
                      "🍔",
                      "📚",
                      "🏪",
                      "🎁",
                      "⚡",
                      "🛍️",
                      "🎉",
                      "🌟",
                      "💎",
                    ].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-btn ${categoryForm.CategoryIcon === icon ? "selected" : ""}`}
                        onClick={() =>
                          setCategoryForm({
                            ...categoryForm,
                            CategoryIcon: icon,
                          })
                        }
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={categoryForm.CategoryName}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        CategoryName: e.target.value,
                      })
                    }
                    placeholder="e.g., Books, Grocery, Electronics"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={categoryForm.Description}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        Description: e.target.value,
                      })
                    }
                    placeholder="Brief description of this category"
                    rows="3"
                  />
                </div>

                <div className="modal-footer">
                  <button type="submit" className="submit-btn">
                    {editCategory ? "Update Category" : "Create Category"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}{" "}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreAdmin;
