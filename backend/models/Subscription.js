import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
  quantity: { type: Number, required: true },
  frequency: { type: String, enum: ["daily", "weekly"], required: true },
  deliveryAddress: { type: String, required: true },
  deliveryType: { type: String, enum: ["standard", "express", "farm_pickup"], default: "standard" },
  paymentMethod: { type: String, default: "cod" },
  status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
  nextDeliveryDate: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model("Subscription", SubscriptionSchema);
