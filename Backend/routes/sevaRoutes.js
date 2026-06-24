import express from 'express';
import { 
  saveSevaEntry, 
  getAllSevaEntries, 
  getSevaEntriesByMember,
  getSevaReport,
  deleteSevaEntry 
} from '../controllers/sevaController.js';

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin, verifyAttendanceManager } from "../middleware/auth.js";

const router = express.Router();

// 👑 Admin or Attendance Manager (Report access for all or family)
router.post('/', verifyToken, verifyAdmin, saveSevaEntry);
router.get('/', verifyToken, verifyAttendanceManager, getAllSevaEntries);
router.get('/report', verifyToken, getSevaReport); // Privacy handled in controller
router.delete('/:id', verifyToken, verifyAdmin, deleteSevaEntry);

// 🔐 Logged-in user (view own or specific member data)
router.get('/member/:memberId', verifyToken, getSevaEntriesByMember);

export default router;