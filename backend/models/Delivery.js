import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pickupLocation: { type: String, default: "" },
  deliveryLocation: { type: String, default: "" },
  pickupLatitude: { type: Number },
  pickupLongitude: { type: Number },
  deliveryLatitude: { type: Number },
  deliveryLongitude: { type: Number },
  agentLatitude: { type: Number },
  agentLongitude: { type: Number },
  lastLocationUpdate: { type: Date },
  route: { type: String, default: "" },
  vehicleType: { type: String, enum: ["bike", "auto", "truck", "van"], default: "bike" },
  agentPhone: { type: String, default: "" },
  estimatedTime: { type: String, default: "" },
  estimatedMinutes: { type: Number, default: 0 }, // computed ETA in minutes
  trackingCode: { type: String, default: "" },
  status: {
    type: String,
    enum: ["assigned", "picked_up", "in_transit", "delivered", "failed"],
    default: "assigned"
  },
  pickupPhoto: { type: String, default: "" },
  deliveryPhoto: { type: String, default: "" },
  aiVerificationResult: { type: String, enum: ["pending", "match", "mismatch"], default: "pending" },
  aiVerificationNotes: { type: String, default: "" },
  deliveredAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("Delivery", deliverySchema);