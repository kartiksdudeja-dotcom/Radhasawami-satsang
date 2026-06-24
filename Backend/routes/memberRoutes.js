import express from 'express';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  getFamilyMembers,
  updateMemberPower
} from '../controllers/memberController.js';

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🔐 Logged-in users
router.get('/', verifyToken, getAllMembers);

// 👑 Admin only (critical actions)
router.patch('/:id/power', verifyToken, verifyAdmin, updateMemberPower);
router.post('/', verifyToken, verifyAdmin, createMember);
router.put('/:id', verifyToken, verifyAdmin, updateMember);
router.delete('/:id', verifyToken, verifyAdmin, deleteMember);

// 🔐 Logged-in users (safe operations)
router.get('/family/:userId', verifyToken, getFamilyMembers);
router.get('/search', verifyToken, searchMembers);
router.get('/:id', verifyToken, getMemberById);

export default router;