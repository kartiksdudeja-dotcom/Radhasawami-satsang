import express from 'express';
import { getSevaOptions, addSevaOption, deleteSevaOption } from '../controllers/sevaMasterController.js';

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// 🌐 Public (or you can make it verifyToken if needed)
router.get('/', getSevaOptions);

// 👑 Admin only
router.post('/', verifyToken, verifyAdmin, addSevaOption);
router.delete('/:id', verifyToken, verifyAdmin, deleteSevaOption);

export default router;