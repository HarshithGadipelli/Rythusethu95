import express from "express";
import { register, login, getProfile, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register", upload.fields([
  { name: "farmerPhoto", maxCount: 1 },
  { name: "farmPhoto", maxCount: 1 },
  { name: "productPhoto", maxCount: 1 },
  { name: "aadhaarPhoto", maxCount: 1 },
  { name: "avatar", maxCount: 1 }
]), register);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

export default router;