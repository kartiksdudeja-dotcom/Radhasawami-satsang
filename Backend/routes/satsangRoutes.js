import express from "express";
import { 
  getSatsangCategories, 
  addSatsangCategory, 
  updateSatsangCategory, 
  deleteSatsangCategory 
} from "../controllers/satsangController.js";

const router = express.Router();

router.get("/", getSatsangCategories);
router.post("/", addSatsangCategory);
router.put("/:id", updateSatsangCategory);
router.delete("/:id", deleteSatsangCategory);

export default router;
