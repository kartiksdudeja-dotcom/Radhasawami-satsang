import express from "express";
import {
  getAllAttendance,
  getAttendanceByDate,
  createAttendance,
  deleteAttendance,
  deleteMemberFromAttendance,
  updateAttendance,
  getMemberAttendanceStats,
} from "../controllers/attendanceController.js";

import { verifyToken, verifyAdmin, verifyAttendanceManager } from "../middleware/auth.js";

const router = express.Router();

// 👑 Admin only
// 👑 Admin or Attendance Manager
router.get("/", verifyToken, verifyAttendanceManager, getAllAttendance);
router.get("/by-date", verifyToken, getAttendanceByDate); // Privacy handled in controller
router.post("/", verifyToken, verifyAttendanceManager, createAttendance);
router.put("/:id", verifyToken, verifyAttendanceManager, updateAttendance);
router.delete("/:id", verifyToken, verifyAdmin, deleteAttendance); // ONLY Super Admin can delete
router.delete("/:attendanceId/member/:memberId", verifyToken, verifyAdmin, deleteMemberFromAttendance);

// 🔐 Logged-in user (own stats for home page)
router.get("/member-stats/:memberId", verifyToken, getMemberAttendanceStats);

export default router;
