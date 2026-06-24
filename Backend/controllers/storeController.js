import { getPool } from "../config/db.js";
import sql from "mssql";

// ==================== STORE ITEMS ====================

// Get all store items
export async function getAllItems(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ItemID, ItemName, Description, Category, Price, Quantity, Unit, IsActive, CreatedDate, UpdatedDate, ImageData
      FROM StoreItems 
      WHERE (IsActive = 1 OR IsActive IS NULL)
      ORDER BY ItemName
    `);

    const items = result.recordset.map((item) => {
  let imageBase64 = null;

  if (item.ImageData) {
    try {
      // ✅ Case 1: Already string (base64 or prefixed)
      if (typeof item.ImageData === "string") {
        let img = item.ImageData.trim();

        // Remove prefix if exists
        if (img.includes("base64,")) {
          img = img.split("base64,").pop();
        }

        imageBase64 = img;
      }

      // ✅ Case 2: Buffer (correct case)
      else {
        const buffer = Buffer.isBuffer(item.ImageData)
          ? item.ImageData
          : Buffer.from(item.ImageData.data);

        imageBase64 = buffer.toString("base64");
      }
    } catch (e) {
      console.warn(`❌ Image conversion failed for item ${item.ItemID}`);
      imageBase64 = null;
    }
  }

  return {
    ...item,
    ImageData: imageBase64,
    image: imageBase64,
  };
});

    console.log(`✅ Loaded ${items.length} items with images`);
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get item by ID
export async function getItemById(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().input("id", sql.Int, req.params.id)
      .query(`
        SELECT 
          ItemID,
          ItemName,
          Description,
          Category,
          Price,
          Quantity,
          Unit,
          IsActive,
          CreatedDate,
          UpdatedDate,
          ImageData
        FROM StoreItems 
        WHERE ItemID = @id AND IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const item = result.recordset[0];

    // Convert binary to base64 if image exists
    if (item.ImageData) {
      try {
        const buffer = Buffer.isBuffer(item.ImageData)
          ? item.ImageData
          : Buffer.from(item.ImageData.data);

        // Return ONLY the base64 string (without prefix) - let frontend add prefix as needed
        item.ImageData = buffer.toString("base64");
        item.image = item.ImageData;
      } catch (e) {
        console.warn(
          `Could not convert image data for item ${item.ItemID}`,
          e.message,
        );
        item.ImageData = null;
      }
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create store item
export async function createItem(req, res) {
  try {
    // Step 1: Fix mapping (Support both frontend and backend naming)
    const ItemName = req.body.ItemName || req.body.name;
    const Description = req.body.Description || req.body.description;
    const Category = req.body.Category || req.body.category;
    const Price = Number(req.body.Price || req.body.price);
    const Quantity = Number(req.body.Quantity || req.body.quantity || 0);
    const Unit = req.body.Unit || req.body.unit;
    const SupplierID = req.body.SupplierID || req.body.supplierId;
    const RawImageData = req.body.ImageData || req.body.image;

    // Step 2: Debug Log
    console.log("🧾 Incoming Data:", { ItemName, Price, Quantity, Category });

    // Step 3: Validate (CRITICAL)
    if (!ItemName || isNaN(Price)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ItemName or Price. Please provide valid details.",
      });
    }

    const pool = await getPool();

    // Step 4: Handle Image Data
    let imageDataBuffer = null;
    if (RawImageData) {
      console.log(
        `📸 Received item photo - Original length: ${RawImageData.length}`,
      );
      const cleanImageData = RawImageData.includes("base64,")
        ? RawImageData.split("base64,").pop()
        : RawImageData.includes(",")
          ? RawImageData.split(",")[1]
          : RawImageData;
      imageDataBuffer = Buffer.from(cleanImageData.trim(), "base64");
      console.log(
        `✅ Image buffer created - Size: ${Math.round(imageDataBuffer.length / 1024)} KB`,
      );
    }

    const result = await pool
      .request()
      .input("ItemName", sql.NVarChar(255), ItemName)
      .input("Description", sql.NVarChar(sql.MAX), Description || null)
      .input("Category", sql.NVarChar(100), Category || null)
      .input("Price", sql.Decimal(10, 2), Price)
      .input("Quantity", sql.Int, Quantity)
      .input("Unit", sql.NVarChar(50), Unit || null)
      .input("SupplierID", sql.Int, SupplierID || null)
      .input("ImageData", sql.VarBinary(sql.MAX), imageDataBuffer).query(`
        INSERT INTO StoreItems (ItemName, Description, Category, Price, Quantity, Unit, SupplierID, ImageData, IsActive, CreatedDate, UpdatedDate)
        VALUES (@ItemName, @Description, @Category, @Price, @Quantity, @Unit, @SupplierID, @ImageData, 1, GETUTCDATE(), GETUTCDATE());
        SELECT SCOPE_IDENTITY() as ItemID;
      `);

    res.json({
      success: true,
      message: "Item created successfully",
      ItemID: result.recordset[0].ItemID,
    });
  } catch (error) {
    console.error("❌ Error creating item:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: "Check server PM2 logs for full SQL error",
    });
  }
}

// Update store item
export async function updateItem(req, res) {
  try {
    const { id } = req.params;

    // Step 1: Fix mapping
    const ItemName = req.body.ItemName || req.body.name;
    const Description = req.body.Description || req.body.description;
    const Category = req.body.Category || req.body.category;
    const Price = Number(req.body.Price || req.body.price);
    const Quantity = Number(req.body.Quantity || req.body.quantity || 0);
    const Unit = req.body.Unit || req.body.unit;
    const SupplierID = req.body.SupplierID || req.body.supplierId;
    const RawImageData = req.body.ImageData || req.body.image;

    // Step 2: Debug Log
    console.log(`🧾 Update Request for ID ${id}:`, {
      ItemName,
      Price,
      Quantity,
    });

    // Step 3: Validate
    if (!ItemName || isNaN(Price)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ItemName or Price for update.",
      });
    }

    const pool = await getPool();

    // Check if item exists first
    const checkResult = await pool
      .request()
      .input("ItemID", sql.Int, id)
      .query("SELECT ItemID FROM StoreItems WHERE ItemID = @ItemID");

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    // Hande Image Data
    let imageDataBuffer = null;
    if (RawImageData) {
      const cleanImageData = RawImageData.includes("base64,")
        ? RawImageData.split("base64,").pop()
        : RawImageData.includes(",")
          ? RawImageData.split(",")[1]
          : RawImageData;
      imageDataBuffer = Buffer.from(cleanImageData.trim(), "base64");
      console.log(
        `✅ Image buffer created for update - Size: ${Math.round(imageDataBuffer.length / 1024)} KB`,
      );
    } else {
      console.log(
        `ℹ️ No new image provided for update, keeping existing image.`,
      );
    }

    await pool
      .request()
      .input("ItemID", sql.Int, id)
      .input("ItemName", sql.NVarChar(255), ItemName)
      .input("Description", sql.NVarChar(sql.MAX), Description || null)
      .input("Category", sql.NVarChar(100), Category || null)
      .input("Price", sql.Decimal(10, 2), Price)
      .input("Quantity", sql.Int, Quantity)
      .input("Unit", sql.NVarChar(50), Unit || null)
      .input("SupplierID", sql.Int, SupplierID || null)
      .input("ImageData", sql.VarBinary(sql.MAX), imageDataBuffer).query(`
        UPDATE StoreItems 
        SET ItemName = @ItemName, 
            Description = @Description, 
            Category = @Category,
            Price = @Price, 
            Quantity = @Quantity, 
            Unit = @Unit, 
            SupplierID = @SupplierID,
            ImageData = CASE WHEN @ImageData IS NOT NULL THEN @ImageData ELSE ImageData END,
            UpdatedDate = GETUTCDATE()
        WHERE ItemID = @ItemID
      `);

    res.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    console.error("❌ Error updating item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete store item
export async function deleteItem(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    console.log(`\n🗑️  Deleting Item #${id}...`);

    // Verify item exists first
    const itemCheck = await pool
      .request()
      .input("ItemID", sql.Int, id)
      .query(`SELECT ItemID FROM StoreItems WHERE ItemID = @ItemID`);

    if (itemCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    console.log(`✓ Item #${id} found, proceeding with deletion`);
    // Delete the item
    const deleteResult = await pool
      .request()
      .input("ItemID", sql.Int, id)
      .query(`DELETE FROM StoreItems WHERE ItemID = @ItemID`);

    res.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== STORE ORDERS ====================

// Get all orders
export async function getAllOrders(req, res) {
  try {
    const pool = await getPool();
    console.log("🔍 Fetching all orders with items...");

    // Get all orders with member details
    const orderResult = await pool.request().query(`
      SELECT o.*, m.MemberName, m.Branch
      FROM StoreOrders o
      LEFT JOIN (
        SELECT MemberID, Name as MemberName, Branch,
               ROW_NUMBER() OVER(PARTITION BY MemberID ORDER BY (SELECT NULL)) as rn
        FROM MemberDetails
      ) m ON o.MemberID = m.MemberID AND m.rn = 1
      ORDER BY o.OrderDate DESC
    `);

    console.log(`📦 Found ${orderResult.recordset.length} orders`);

    // Get all order items with product details
    const itemsResult = await pool.request().query(`
      SELECT 
        oi.OrderID,
        oi.ItemID,
        oi.Quantity,
        oi.UnitPrice,
        oi.TotalPrice,
        si.ItemName
      FROM StoreOrderItems oi
      LEFT JOIN StoreItems si ON oi.ItemID = si.ItemID
      ORDER BY oi.OrderID
    `);

    console.log(`📋 Found ${itemsResult.recordset.length} order items`);

    // Group items by OrderID
    const itemsByOrder = {};
    itemsResult.recordset.forEach((item) => {
      if (!itemsByOrder[item.OrderID]) {
        itemsByOrder[item.OrderID] = [];
      }
      itemsByOrder[item.OrderID].push({
        ItemID: item.ItemID,
        ItemName: item.ItemName || "Unknown Product",
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
        TotalPrice: item.TotalPrice,
      });
    });

    // Attach items to each order
    const ordersWithItems = orderResult.recordset.map((order) => ({
      ...order,
      Items: itemsByOrder[order.OrderID] || [],
    }));

    console.log(`✅ Fetched ${ordersWithItems.length} orders with items`);
    res.json({
      success: true,
      data: ordersWithItems,
      count: ordersWithItems.length,
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get order by ID with items
export async function getOrderById(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().input("id", sql.Int, req.params.id)
      .query(`
        SELECT o.*, m.Name as MemberName
        FROM StoreOrders o
        LEFT JOIN MemberDetails m ON o.MemberID = m.MemberID
        WHERE o.OrderID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const order = result.recordset[0];
    const itemsResult = await pool.request().input("id", sql.Int, req.params.id)
      .query(`
        SELECT oi.*, si.ItemName, si.Category
        FROM StoreOrderItems oi
        LEFT JOIN StoreItems si ON oi.ItemID = si.ItemID
        WHERE oi.OrderID = @id
      `);

    order.items = itemsResult.recordset;
    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create order
export async function createOrder(req, res) {
  try {
    const { MemberID, TotalAmount, Status, Items } = req.body;

    if (!MemberID || !Array.isArray(Items) || Items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "MemberID and Items array are required",
      });
    }

    const pool = await getPool();
    const orderNumber = `ORD-${Date.now()}`;

    const result = await pool
      .request()
      .input("OrderNumber", sql.NVarChar(50), orderNumber)
      .input("MemberID", sql.Int, MemberID)
      .input("TotalAmount", sql.Decimal(12, 2), TotalAmount || 0)
      .input("Status", sql.NVarChar(50), Status || "Pending").query(`
        INSERT INTO StoreOrders (OrderNumber, MemberID, TotalAmount, Status, OrderDate, CreatedDate, UpdatedDate)
        VALUES (@OrderNumber, @MemberID, @TotalAmount, @Status, GETUTCDATE(), GETUTCDATE(), GETUTCDATE());
        SELECT @@IDENTITY as OrderID;
      `);

    const OrderID = result.recordset[0].OrderID;
    console.log(
      `\n📝 Creating order #${OrderID} for MemberID: ${MemberID}, Total: ₹${TotalAmount}`,
    );

    // Insert order items and reduce inventory
    for (const item of Items) {
      console.log(
        `\n📦 Processing item - ItemID: ${item.ItemID}, Qty: ${item.Quantity}`,
      );

      // Insert into StoreOrderItems
      await pool
        .request()
        .input("OrderID", sql.Int, OrderID)
        .input("ItemID", sql.Int, item.ItemID)
        .input("Quantity", sql.Int, item.Quantity)
        .input("UnitPrice", sql.Decimal(10, 2), item.UnitPrice)
        .input("TotalPrice", sql.Decimal(12, 2), item.TotalPrice).query(`
          INSERT INTO StoreOrderItems (OrderID, ItemID, Quantity, UnitPrice, TotalPrice)
          VALUES (@OrderID, @ItemID, @Quantity, @UnitPrice, @TotalPrice)
        `);

      console.log(`✅ Order item inserted`);

      // Check current quantity before reduction
      const checkResult = await pool
        .request()
        .input("ItemID", sql.Int, item.ItemID)
        .query(`SELECT Quantity FROM StoreItems WHERE ItemID = @ItemID`);

      const currentQty = checkResult.recordset[0]?.Quantity || 0;
      console.log(`📊 Current inventory: ${currentQty} units`);

      // Reduce inventory quantity
      const updateQuery = `
        UPDATE StoreItems 
        SET Quantity = Quantity - ${item.Quantity}
        WHERE ItemID = ${item.ItemID}
      `;

      console.log(`📝 Executing update query: ${updateQuery}`);

      const updateResult = await pool.request().query(updateQuery);

      console.log(`✅ Inventory update executed`);
      console.log(`   Rows affected: ${updateResult.rowsAffected[0]}`);

      // Verify new quantity
      const verifyResult = await pool
        .request()
        .input("ItemID", sql.Int, item.ItemID)
        .query(`SELECT Quantity FROM StoreItems WHERE ItemID = @ItemID`);

      const newQty = verifyResult.recordset[0]?.Quantity || 0;
      console.log(
        `📉 New inventory: ${newQty} units (Reduced by ${item.Quantity})`,
      );

      if (newQty === currentQty) {
        console.error(
          `❌ ERROR: Quantity was NOT reduced! Still ${newQty} units`,
        );
        throw new Error(`Inventory update failed for ItemID ${item.ItemID}`);
      } else {
        console.log(`✅ Inventory reduced successfully`);
      }
    }

    res.json({
      success: true,
      message: "Order created successfully and inventory updated",
      OrderID: OrderID,
      OrderNumber: orderNumber,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update order status
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { Status } = req.body;

    const pool = await getPool();
    await pool
      .request()
      .input("OrderID", sql.Int, id)
      .input("Status", sql.NVarChar(50), Status).query(`
        UPDATE StoreOrders 
        SET Status = @Status, UpdatedDate = GETUTCDATE()
        WHERE OrderID = @OrderID
      `);

    res.json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update category
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { CategoryName, Description, CategoryIcon, IsActive } = req.body;
    const pool = await getPool();

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, CategoryName)
      .input("desc", sql.NVarChar, Description)
      .input("icon", sql.NVarChar, CategoryIcon)
      .input("active", sql.Bit, IsActive).query(`
        UPDATE StoreCategories 
        SET CategoryName = @name, 
            Description = @desc, 
            CategoryIcon = @icon, 
            IsActive = @active,
            UpdatedDate = GETUTCDATE()
        WHERE CategoryID = @id
      `);

    res.json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.error("❌ Error updating category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete order (also restores inventory)
export async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    console.log(`\n🗑️  Deleting Order #${id}...`);

    // Verify order exists first
    const orderCheck = await pool
      .request()
      .input("OrderID", sql.Int, id)
      .query(`SELECT OrderID FROM StoreOrders WHERE OrderID = @OrderID`);

    if (orderCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    console.log(`✓ Order #${id} found, proceeding with deletion`);

    // Get order items first to restore inventory
    const orderItemsResult = await pool
      .request()
      .input("OrderID", sql.Int, id)
      .query(
        `SELECT ItemID, Quantity FROM StoreOrderItems WHERE OrderID = @OrderID`,
      );

    console.log(
      `📦 Found ${orderItemsResult.recordset.length} items to restore`,
    );

    // Restore inventory for each item
    for (const item of orderItemsResult.recordset) {
      console.log(
        `📦 Restoring ${item.Quantity} units for ItemID ${item.ItemID}`,
      );

      const updateResult = await pool
        .request()
        .input("ItemID", sql.Int, item.ItemID)
        .input("Quantity", sql.Int, item.Quantity).query(`
          UPDATE StoreItems 
          SET Quantity = Quantity + @Quantity
          WHERE ItemID = @ItemID
        `);

      console.log(
        `✅ Inventory restored - Rows affected: ${updateResult.rowsAffected[0]}`,
      );
    }

    // Delete order items
    const deleteItemsResult = await pool
      .request()
      .input("OrderID", sql.Int, id)
      .query(`DELETE FROM StoreOrderItems WHERE OrderID = @OrderID`);

    console.log(
      `✅ Order items deleted - Rows affected: ${deleteItemsResult.rowsAffected[0]}`,
    );

    // Delete order
    const deleteOrderResult = await pool
      .request()
      .input("OrderID", sql.Int, id)
      .query(`DELETE FROM StoreOrders WHERE OrderID = @OrderID`);

    console.log(
      `✅ Order deleted successfully - Rows affected: ${deleteOrderResult.rowsAffected[0]}`,
    );

    // ✅ NEW: Renumber remaining orders to avoid gaps using delete/reinsert
    console.log(`\n🔄 Renumbering remaining orders...`);

    // Get all remaining orders with all data
    const remainingOrdersResult = await pool.request().query(`
      SELECT * FROM StoreOrders ORDER BY OrderDate ASC
    `);
    const orders = remainingOrdersResult.recordset;

    if (orders.length > 0) {
      // Get all order items
      const allItemsResult = await pool.request().query(`
        SELECT * FROM StoreOrderItems ORDER BY OrderID
      `);
      const allItems = allItemsResult.recordset;

      // Disable constraints
      await pool
        .request()
        .query(`ALTER TABLE StoreOrderItems NOCHECK CONSTRAINT ALL`);

      // Delete old items and orders
      await pool.request().query(`DELETE FROM StoreOrderItems`);
      await pool.request().query(`DELETE FROM StoreOrders`);

      // Reseed IDENTITY to start from 1
      await pool.request().query(`DBCC CHECKIDENT ('StoreOrders', RESEED, 0)`);

      // Build INSERT script with IDENTITY_INSERT for entire batch
      let insertScript = `SET IDENTITY_INSERT StoreOrders ON\n`;
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const newId = i + 1;

        const orderNumber = (order.OrderNumber || "").replace(/'/g, "''");
        const notes = (order.Notes || "").replace(/'/g, "''");
        const orderDate = new Date(order.OrderDate)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);
        const createdDate = new Date(order.CreatedDate)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);
        const updatedDate = new Date(order.UpdatedDate)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);

        console.log(`  Order ${order.OrderID} → Order ${newId}`);
        insertScript += `INSERT INTO StoreOrders (OrderID, OrderNumber, MemberID, TotalAmount, Status, OrderDate, Notes, CreatedDate, UpdatedDate) VALUES (${newId}, '${orderNumber}', ${order.MemberID}, ${order.TotalAmount}, '${order.Status}', '${orderDate}', '${notes}', '${createdDate}', '${updatedDate}')\n`;
      }
      insertScript += `SET IDENTITY_INSERT StoreOrders OFF\n`;

      await pool.request().query(insertScript);

      // Recreate order items with updated OrderIDs
      for (const item of allItems) {
        const oldOrderIndex = orders.findIndex(
          (o) => o.OrderID === item.OrderID,
        );
        const newOrderId = oldOrderIndex + 1;

        await pool
          .request()
          .input("OrderID", sql.Int, newOrderId)
          .input("ItemID", sql.Int, item.ItemID)
          .input("Quantity", sql.Int, item.Quantity)
          .input("UnitPrice", sql.Decimal(10, 2), item.UnitPrice)
          .input("TotalPrice", sql.Decimal(10, 2), item.TotalPrice).query(`
            INSERT INTO StoreOrderItems 
            (OrderID, ItemID, Quantity, UnitPrice, TotalPrice)
            VALUES 
            (@OrderID, @ItemID, @Quantity, @UnitPrice, @TotalPrice)
          `);
      }

      // Re-enable constraints
      await pool
        .request()
        .query(`ALTER TABLE StoreOrderItems WITH CHECK CHECK CONSTRAINT ALL`);

      // Reset IDENTITY seed to next number
      await pool
        .request()
        .query(`DBCC CHECKIDENT ('StoreOrders', RESEED, ${orders.length})`);
    }

    const totalOrders = orders.length;
    console.log(`✅ Renumbering complete - Total orders: ${totalOrders}`);
    console.log(`📊 Next order ID will be: #${totalOrders + 1}`);

    res.json({
      success: true,
      message: "Order deleted and remaining orders renumbered",
      totalOrders: totalOrders,
    });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== STORE SALES ====================

// Get all sales
export async function getAllSales(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.*, m.Name as MemberName, si.ItemName
      FROM StoreSales s
      LEFT JOIN MemberDetails m ON s.MemberID = m.MemberID
      LEFT JOIN StoreItems si ON s.ItemID = si.ItemID
      ORDER BY s.SaleDate DESC
    `);
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create sale
export async function createSale(req, res) {
  try {
    const {
      OrderID,
      MemberID,
      TotalAmount,
      PaymentStatus,
      Items, // This is an array from the frontend
    } = req.body;

    const pool = await getPool();

    // If Items is an array, we record each item as a sale
    if (Array.isArray(Items) && Items.length > 0) {
      const results = [];
      for (const item of Items) {
        const idResult = await pool
          .request()
          .query("SELECT ISNULL(MAX(SaleID), 0) + 1 as nextId FROM StoreSales");
        const nextId = idResult.recordset[0].nextId;

        const result = await pool
          .request()
          .input("SaleID", sql.Int, nextId)
          .input("OrderID", sql.Int, OrderID || null)
          .input("ItemID", sql.Int, item.ItemID)
          .input("MemberID", sql.Int, MemberID)
          .input("Quantity", sql.Int, item.Quantity || 1)
          .input("UnitPrice", sql.Decimal(10, 2), item.UnitPrice || 0)
          .input(
            "TotalAmount",
            sql.Decimal(12, 2),
            item.TotalPrice || item.Quantity * item.UnitPrice || TotalAmount,
          )
          .input(
            "PaymentStatus",
            sql.NVarChar(50),
            PaymentStatus || "Completed",
          ).query(`
            INSERT INTO StoreSales (SaleID, OrderID, ItemID, MemberID, Quantity, UnitPrice, TotalAmount, PaymentStatus, SaleDate)
            VALUES (@SaleID, @OrderID, @ItemID, @MemberID, @Quantity, @UnitPrice, @TotalAmount, @PaymentStatus, GETUTCDATE());
          `);
        results.push({ SaleID: nextId, ItemID: item.ItemID });
      }

      return res.json({
        success: true,
        message: "Sales recorded successfully",
        Sales: results,
      });
    }

    // Fallback for single item (legacy/other calls)
    const { ItemID, Quantity, UnitPrice } = req.body;
    const idResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(SaleID), 0) + 1 as nextId FROM StoreSales");
    const nextId = idResult.recordset[0].nextId;

    const result = await pool
      .request()
      .input("SaleID", sql.Int, nextId)
      .input("OrderID", sql.Int, OrderID || null)
      .input("ItemID", sql.Int, ItemID)
      .input("MemberID", sql.Int, MemberID)
      .input("Quantity", sql.Int, Quantity)
      .input("UnitPrice", sql.Decimal(10, 2), UnitPrice)
      .input("TotalAmount", sql.Decimal(12, 2), TotalAmount)
      .input("PaymentStatus", sql.NVarChar(50), PaymentStatus || "Completed")
      .query(`
        INSERT INTO StoreSales (SaleID, OrderID, ItemID, MemberID, Quantity, UnitPrice, TotalAmount, PaymentStatus, SaleDate)
        VALUES (@SaleID, @OrderID, @ItemID, @MemberID, @Quantity, @UnitPrice, @TotalAmount, @PaymentStatus, GETUTCDATE());
        SELECT @SaleID as SaleID;
      `);

    res.json({
      success: true,
      message: "Sale recorded successfully",
      SaleID: nextId,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete sale
export async function deleteSale(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    console.log(`\n🗑️  Deleting Sale #${id}...`);

    // Verify sale exists first
    const saleCheck = await pool
      .request()
      .input("SaleID", sql.Int, id)
      .query(`SELECT SaleID FROM StoreSales WHERE SaleID = @SaleID`);

    if (saleCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    console.log(`✓ Sale #${id} found, proceeding with deletion`);

    // Delete the sale
    const deleteResult = await pool
      .request()
      .input("SaleID", sql.Int, id)
      .query(`DELETE FROM StoreSales WHERE SaleID = @SaleID`);

    console.log(
      `✅ Sale deleted successfully - Rows affected: ${deleteResult.rowsAffected[0]}`,
    );

    // ✅ Renumber remaining sales to avoid gaps
    console.log(`\n🔄 Renumbering remaining sales...`);

    // Get all remaining sales with all data
    const remainingSalesResult = await pool.request().query(`
      SELECT * FROM StoreSales ORDER BY SaleID ASC
    `);
    const sales = remainingSalesResult.recordset;

    if (sales.length > 0) {
      // Reseed IDENTITY to start from 1
      await pool.request().query(`DBCC CHECKIDENT ('StoreSales', RESEED, 0)`);

      // Build INSERT script with IDENTITY_INSERT for entire batch
      let insertScript = `SET IDENTITY_INSERT StoreSales ON\n`;
      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        const newId = i + 1;

        console.log(`  Sale ${sale.SaleID} → Sale ${newId}`);
        insertScript += `INSERT INTO StoreSales (SaleID, OrderID, MemberID, TotalAmount, SaleDate, Notes) VALUES (${newId}, ${sale.OrderID}, ${sale.MemberID}, ${sale.TotalAmount}, '${new Date(sale.SaleDate).toISOString().replace("T", " ").slice(0, 19)}', '${(sale.Notes || "").replace(/'/g, "''")}')\n`;
      }
      insertScript += `SET IDENTITY_INSERT StoreSales OFF\n`;

      await pool.request().query(`DELETE FROM StoreSales`);
      await pool.request().query(insertScript);
      await pool
        .request()
        .query(`DBCC CHECKIDENT ('StoreSales', RESEED, ${sales.length})`);
    }

    const totalSales = sales.length;
    console.log(`✅ Renumbering complete - Total sales: ${totalSales}`);
    console.log(`📊 Next sale ID will be: #${totalSales + 1}`);

    res.json({
      success: true,
      message: "Sale deleted and remaining sales renumbered",
      totalSales: totalSales,
    });
  } catch (error) {
    console.error("❌ Error deleting sale:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== STORE INVENTORY ====================

// Get inventory for item
export async function getInventory(req, res) {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("ItemID", sql.Int, req.params.itemId).query(`
        SELECT si.*, st.ItemName
        FROM StoreInventory si
        LEFT JOIN StoreItems st ON si.ItemID = st.ItemID
        WHERE si.ItemID = @ItemID
        ORDER BY si.TransactionDate DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update inventory
export async function updateInventory(req, res) {
  try {
    const { ItemID, QuantityIn, QuantityOut, TransactionType } = req.body;

    const pool = await getPool();
    const currentStock = await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .query("SELECT Quantity FROM StoreItems WHERE ItemID = @ItemID");

    if (currentStock.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const currentQty = currentStock.recordset[0].Quantity || 0;
    const newQty = currentQty + (QuantityIn || 0) - (QuantityOut || 0);

    // Update item quantity
    await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .input("Quantity", sql.Int, newQty)
      .query(
        "UPDATE StoreItems SET Quantity = @Quantity WHERE ItemID = @ItemID",
      );

    // Log transaction
    await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .input("QuantityIn", sql.Int, QuantityIn || 0)
      .input("QuantityOut", sql.Int, QuantityOut || 0)
      .input("CurrentStock", sql.Int, newQty)
      .input("TransactionType", sql.NVarChar(50), TransactionType || "Manual")
      .query(`
        INSERT INTO StoreInventory (ItemID, QuantityIn, QuantityOut, CurrentStock, TransactionType)
        VALUES (@ItemID, @QuantityIn, @QuantityOut, @CurrentStock, @TransactionType)
      `);

    res.json({
      success: true,
      message: "Inventory updated successfully",
      newStock: newQty,
    });
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get inventory summary
export async function getInventorySummary(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        si.ItemID,
        si.ItemName,
        si.Category,
        si.Quantity,
        si.Price,
        (si.Quantity * si.Price) as TotalValue,
        CASE WHEN si.Quantity <= 10 THEN 'Low' ELSE 'Adequate' END as StockStatus
      FROM StoreItems si
      WHERE si.IsActive = 1
      ORDER BY si.Quantity ASC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
// ==================== AI-POWERED CATEGORIES ====================

// AI Detection - Suggest categories for items
export async function suggestCategoriesForItems(req, res) {
  try {
    const pool = await getPool();

    // Get all items without category assignments
    const result = await pool.request().query(`
      SELECT DISTINCT 
        si.ItemID,
        si.ItemName,
        si.Description,
        si.Category as ManualCategory
      FROM StoreItems si
      LEFT JOIN StoreCategoryItems sci ON si.ItemID = sci.ItemID
      WHERE si.IsActive = 1
      ORDER BY si.ItemName
    `);

    const items = result.recordset;

    // AI Logic: Categorize items based on keywords
    const suggestions = items.map((item) => {
      const itemText =
        `${item.ItemName} ${item.Description || ""}`.toLowerCase();
      const categories = detectItemCategories(itemText, item.ManualCategory);

      return {
        ItemID: item.ItemID,
        ItemName: item.ItemName,
        SuggestedCategories: categories,
        ManualCategory: item.ManualCategory,
      };
    });

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("Error suggesting categories:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// AI Detection Helper - Smart category detection
function detectItemCategories(itemText, manualCategory) {
  const categoryKeywords = {
    "Medicine & Healthcare": [
      "medicine",
      "medical",
      "tablet",
      "capsule",
      "vitamin",
      "supplement",
      "syrup",
      "injection",
      "bandage",
      "antiseptic",
      "pain relief",
      "fever",
      "cold",
      "cough",
      "health",
      "healthcare",
      "pharmacy",
      "doctor",
      "hospital",
    ],
    Groceries: [
      "rice",
      "dal",
      "flour",
      "wheat",
      "sugar",
      "salt",
      "oil",
      "ghee",
      "spice",
      "masala",
      "dough",
      "pulses",
      "grains",
      "cereals",
      "food",
      "grocery",
      "kitchen",
      "cooking",
    ],
    "Dairy & Eggs": [
      "milk",
      "yogurt",
      "cheese",
      "butter",
      "paneer",
      "cream",
      "dairy",
      "egg",
      "eggs",
      "ghee",
      "curd",
    ],
    "Fruits & Vegetables": [
      "apple",
      "banana",
      "orange",
      "mango",
      "tomato",
      "onion",
      "carrot",
      "potato",
      "lettuce",
      "spinach",
      "fruit",
      "vegetable",
      "fresh",
      "produce",
      "greens",
    ],
    "Snacks & Munchies": [
      "snack",
      "chip",
      "biscuit",
      "cookie",
      "wafer",
      "popcorn",
      "namkeen",
      "crisp",
      "treat",
      "munch",
      "ready to eat",
    ],
    Beverages: [
      "juice",
      "drink",
      "cola",
      "soda",
      "tea",
      "coffee",
      "water",
      "shake",
      "smoothie",
      "beverage",
      "soft drink",
      "energy drink",
    ],
    "Personal Care": [
      "soap",
      "shampoo",
      "conditioner",
      "toothpaste",
      "deodorant",
      "perfume",
      "lotion",
      "cream",
      "face wash",
      "skincare",
      "haircare",
      "personal",
      "hygiene",
      "beauty",
    ],
    "Books & Media": [
      "book",
      "magazine",
      "novel",
      "story",
      "journal",
      "notebook",
      "comic",
      "educational",
      "learning",
      "reading",
    ],
    "Household Items": [
      "cleaning",
      "detergent",
      "dishwash",
      "bleach",
      "polish",
      "broom",
      "duster",
      "cloth",
      "household",
      "home",
      "supplies",
    ],
    "Baby Care": [
      "baby",
      "infant",
      "diaper",
      "formula",
      "milk powder",
      "toy",
      "nursery",
      "child",
      "children",
      "kids",
    ],
  };

  const detectedCategories = [];
  const textWords = itemText.split(/\s+/);

  // Check keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (itemText.includes(keyword)) {
        if (!detectedCategories.includes(category)) {
          detectedCategories.push(category);
        }
        break;
      }
    }
  }

  // If no keywords match, use manual category
  if (detectedCategories.length === 0 && manualCategory) {
    detectedCategories.push(manualCategory);
  }

  // Default category if nothing matches
  if (detectedCategories.length === 0) {
    detectedCategories.push("General Products");
  }

  return detectedCategories;
}

// Auto-generate categories based on all items
export async function autoGenerateCategories(req, res) {
  try {
    const pool = await getPool();

    // Get all items
    const itemsResult = await pool.request().query(`
      SELECT ItemID, ItemName, Description, Category
      FROM StoreItems
      WHERE IsActive = 1
    `);

    const items = itemsResult.recordset;
    const categoriesToCreate = new Set();

    // Detect all categories needed
    items.forEach((item) => {
      const itemText =
        `${item.ItemName} ${item.Description || ""}`.toLowerCase();
      const categories = detectItemCategories(itemText, item.Category);
      categories.forEach((cat) => categoriesToCreate.add(cat));
    });

    // Get existing categories
    const existingResult = await pool.request().query(`
      SELECT CategoryName FROM StoreCategories WHERE IsActive = 1
    `);
    const existingCategories = new Set(
      existingResult.recordset.map((c) => c.CategoryName),
    );

    // Create new categories
    const newCategories = [];
    const categoryEmojis = {
      "Medicine & Healthcare": "💊",
      Groceries: "🌾",
      "Dairy & Eggs": "🥛",
      "Fruits & Vegetables": "🥕",
      "Snacks & Munchies": "🍿",
      Beverages: "🥤",
      "Personal Care": "🧴",
      "Books & Media": "📚",
      "Household Items": "🏠",
      "Baby Care": "👶",
      "General Products": "📦",
    };

    for (const category of categoriesToCreate) {
      if (!existingCategories.has(category)) {
        const icon = categoryEmojis[category] || "📦";

        await pool
          .request()
          .input("CategoryName", sql.NVarChar(100), category)
          .input("CategoryIcon", sql.NVarChar(10), icon)
          .input(
            "Description",
            sql.NVarChar(sql.MAX),
            `Auto-generated: ${category}`,
          ).query(`
            INSERT INTO StoreCategories (CategoryName, CategoryIcon, Description)
            VALUES (@CategoryName, @CategoryIcon, @Description)
          `);

        newCategories.push({ name: category, icon });
      }
    }

    res.json({
      success: true,
      message: `Created ${newCategories.length} new categories`,
      newCategories: newCategories,
      totalCategories: existingCategories.size + newCategories.length,
    });
  } catch (error) {
    console.error("Error generating categories:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add item to category
export async function addItemToCategory(req, res) {
  try {
    const { ItemID, CategoryID } = req.body;

    if (!ItemID || !CategoryID) {
      return res.status(400).json({
        success: false,
        error: "ItemID and CategoryID are required",
      });
    }

    const pool = await getPool();

    // Check if already exists
    const checkResult = await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .input("CategoryID", sql.Int, CategoryID).query(`
        SELECT * FROM StoreCategoryItems 
        WHERE ItemID = @ItemID AND CategoryID = @CategoryID
      `);

    if (checkResult.recordset.length > 0) {
      return res.json({
        success: false,
        message: "Item already in this category",
      });
    }

    // Add item to category
    await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .input("CategoryID", sql.Int, CategoryID).query(`
        INSERT INTO StoreCategoryItems (ItemID, CategoryID)
        VALUES (@ItemID, @CategoryID)
      `);

    res.json({
      success: true,
      message: "Item added to category",
    });
  } catch (error) {
    console.error("Error adding item to category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Remove item from category
export async function removeItemFromCategory(req, res) {
  try {
    const { ItemID, CategoryID } = req.body;

    if (!ItemID || !CategoryID) {
      return res.status(400).json({
        success: false,
        error: "ItemID and CategoryID are required",
      });
    }

    const pool = await getPool();

    await pool
      .request()
      .input("ItemID", sql.Int, ItemID)
      .input("CategoryID", sql.Int, CategoryID).query(`
        DELETE FROM StoreCategoryItems 
        WHERE ItemID = @ItemID AND CategoryID = @CategoryID
      `);

    res.json({
      success: true,
      message: "Item removed from category",
    });
  } catch (error) {
    console.error("Error removing item from category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get items in a category
export async function getItemsByCategory(req, res) {
  try {
    const { categoryId } = req.params;

    const pool = await getPool();

    const result = await pool.request().input("CategoryID", sql.Int, categoryId)
      .query(`
        SELECT 
          si.ItemID,
          si.ItemName,
          si.Category as ManualCategory,
          si.Price,
          si.Quantity,
          si.Description,
          sci.CategoryItemID
        FROM StoreCategoryItems sci
        JOIN StoreItems si ON sci.ItemID = si.ItemID
        WHERE sci.CategoryID = @CategoryID
        ORDER BY si.ItemName
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error("Error fetching category items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get all categories with item count
export async function getAllCategories(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        sc.CategoryID,
        sc.CategoryName,
        sc.CategoryIcon,
        sc.Description,
        COUNT(sci.ItemID) as ItemCount
      FROM StoreCategories sc
      LEFT JOIN StoreCategoryItems sci ON sc.CategoryID = sci.CategoryID
      WHERE sc.IsActive = 1
      GROUP BY sc.CategoryID, sc.CategoryName, sc.CategoryIcon, sc.Description
      ORDER BY sc.CategoryName
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create category
export async function createCategory(req, res) {
  try {
    const { CategoryName, Description, CategoryIcon } = req.body;

    if (!CategoryName) {
      return res.status(400).json({
        success: false,
        error: "CategoryName is required",
      });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("CategoryName", sql.NVarChar(100), CategoryName)
      .input("Description", sql.NVarChar(sql.MAX), Description || "")
      .input("CategoryIcon", sql.NVarChar(10), CategoryIcon || "📦").query(`
        INSERT INTO StoreCategories (CategoryName, Description, CategoryIcon, IsActive, CreatedDate, UpdatedDate)
        OUTPUT INSERTED.CategoryID
        VALUES (@CategoryName, @Description, @CategoryIcon, 1, GETUTCDATE(), GETUTCDATE())
      `);

    res.json({
      success: true,
      message: "Category created",
      CategoryID: result.recordset[0].CategoryID,
    });
  } catch (error) {
    if (error.message.includes("Violation of PRIMARY KEY")) {
      return res.status(400).json({
        success: false,
        error: "Category already exists",
      });
    }
    console.error("Error creating category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete category
export async function deleteCategory(req, res) {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: "CategoryID is required",
      });
    }

    const pool = await getPool();

    // Delete the category (will cascade delete items in this category)
    await pool.request().input("categoryId", sql.Int, categoryId).query(`
        DELETE FROM StoreCategories 
        WHERE CategoryID = @categoryId
      `);

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get separate image for an item (Streaming for performance)
export async function getItemImage(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT ImageData FROM StoreItems WHERE ItemID = @id");

    if (result.recordset.length === 0 || !result.recordset[0].ImageData) {
      return res.status(404).send("Image not found");
    }

    const imageData = result.recordset[0].ImageData;
    let buffer;

    if (Buffer.isBuffer(imageData)) {
      buffer = imageData;
    } else if (imageData.type === "Buffer" && Array.isArray(imageData.data)) {
      buffer = Buffer.from(imageData.data);
    } else {
      return res.status(404).send("Invalid image format");
    }

    // Set cache control for speed (1 hour)
    res.set("Cache-Control", "public, max-age=3600");
    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).send("Server error");
  }
}
