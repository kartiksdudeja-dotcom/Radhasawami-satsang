import express from "express";
import { getPhases, addPhase, updatePhase, deletePhase } from "../controllers/supermanPhaseController.js";

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🌐 Public (or make verifyToken if needed)
router.get("/", getPhases);

// 👑 Admin only
router.post("/", verifyToken, verifyAdmin, addPhase);
router.put("/:id", verifyToken, verifyAdmin, updatePhase);
router.delete("/:id", verifyToken, verifyAdmin, deletePhase);

export default router;