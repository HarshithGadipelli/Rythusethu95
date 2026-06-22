import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  method: { type: String, default: "online" },
  status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },

  // Razorpay fields
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },

  paidAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);