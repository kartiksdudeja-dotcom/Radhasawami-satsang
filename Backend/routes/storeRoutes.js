import express from "express";
import {
  getAllItems,
  getItemById,
  getItemImage,
  createItem,
  updateItem,
  deleteItem,
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getAllSales,
  createSale,
  deleteSale,
  getInventory,
  updateInventory,
  getInventorySummary,
  addItemToCategory,
  removeItemFromCategory,
  getItemsByCategory,
  getAllCategories,
  createCategory,
  deleteCategory,
} from "../controllers/storeController.js";

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// ==================== STORE ITEMS ====================
// 🌐 Public
router.get("/items", getAllItems);
router.get("/items/:id", getItemById);
router.get("/items/:id/image", getItemImage);

// 👑 Admin only
router.post("/items", verifyToken, verifyAdmin, createItem);
router.put("/items/:id", verifyToken, verifyAdmin, updateItem);
router.delete("/items/:id", verifyToken, verifyAdmin, deleteItem);

// ==================== STORE ORDERS ====================
// 🔐 Logged-in users
router.get("/orders", verifyToken, getAllOrders);
router.get("/orders/:id", verifyToken, getOrderById);
router.post("/orders", verifyToken, createOrder);

// 👑 Admin only
router.put("/orders/:id/status", verifyToken, verifyAdmin, updateOrderStatus);
router.delete("/orders/:id", verifyToken, verifyAdmin, deleteOrder);

// ==================== STORE SALES ====================
// 👑 Admin only
router.get("/sales", verifyToken, verifyAdmin, getAllSales);
router.post("/sales", verifyToken, verifyAdmin, createSale);
router.delete("/sales/:id", verifyToken, verifyAdmin, deleteSale);

// ==================== INVENTORY ====================
// 👑 Admin only
router.get("/inventory/:itemId", verifyToken, verifyAdmin, getInventory);
router.put("/inventory", verifyToken, verifyAdmin, updateInventory);
router.get("/inventory-summary", verifyToken, verifyAdmin, getInventorySummary);

// ==================== CATEGORIES ====================
// 🌐 Public
router.get("/categories", getAllCategories);
router.get("/categories/:categoryId/items", getItemsByCategory);

// 👑 Admin only
router.post("/categories", verifyToken, verifyAdmin, createCategory);
router.delete("/categories/:categoryId", verifyToken, verifyAdmin, deleteCategory);
router.post("/categories/items/add", verifyToken, verifyAdmin, addItemToCategory);
router.post("/categories/items/remove", verifyToken, verifyAdmin, removeItemFromCategory);

export default router;