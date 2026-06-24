import express from "express";
import {
  login,
  signup,
  getUser,
  loginAsMember,
  stopImpersonating,
  checkRole,
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimiter.js";

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🔓 Public routes (no token required)
router.post('/login', authLimiter, login);
router.post("/signup", signup);
router.post("/check-role", checkRole); // ✅ Called pre-login to detect admin tab

// 🔐 Logged-in user required
router.get("/user/:id", verifyToken, getUser);

// 👑 Admin-only routes
router.post("/login-as-member", verifyToken, verifyAdmin, loginAsMember);
router.post("/stop-impersonating", verifyToken, stopImpersonating);

export default router;