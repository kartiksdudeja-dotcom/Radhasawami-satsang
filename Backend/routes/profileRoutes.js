import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { 
  getProfile, 
  updateProfilePhoto, 
  updateProfileDetails, 
  completeProfile, 
  checkProfileStatus 
} from "../controllers/profileController.js";

// ✅ NEW JWT middleware
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/profiles");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.id;
    const ext = path.extname(file.originalname);
    cb(null, `profile_${userId}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});


// 🔐 Logged-in user (can access own profile)
router.get("/:id", verifyToken, getProfile);
router.get("/:id/status", verifyToken, checkProfileStatus);

// 🔐 Upload profile photo (user must be logged in)
router.post("/:id/photo", verifyToken, upload.single("photo"), updateProfilePhoto);

// 🔐 Update own profile
router.put("/:id", verifyToken, updateProfileDetails);
router.post("/:id/complete", verifyToken, completeProfile);

// 👑 (Optional) Admin-only override routes (if needed)
// router.put("/:id/admin", verifyToken, verifyAdmin, updateProfileDetails);

export default router;