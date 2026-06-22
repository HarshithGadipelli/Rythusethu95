import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, default: "Notification" },
  message: { type: String, required: true },
  type: { type: String, enum: ["order", "reward", "system", "delivery", "verification", "report"], default: "system" },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed }, // extra data (orderId, etc.)
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);