import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
  status: String,
  note: String,
  timestamp: { type: Date, default: Date.now }
});

const productSnapshotSchema = new mongoose.Schema({
  name: String,
  category: String,
  isOrganic: Boolean,
  isPesticideFree: Boolean,
  quantity: Number,
  unit: String,
  price: Number,
  image: String,
  location: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  deliveryCharges: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "prebooked", "confirmed", "processing", "assigned", "picked_up", "in_transit", "delivered", "cancelled"],
    default: "pending"
  },
  isPrebooked: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
  pointsUsed: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ["cod", "upi", "card", "wallet", "online"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
  
  // ─── Location & Tracking ───
  pickupAddress: { type: String, default: "" },
  pickupLatitude: { type: Number },
  pickupLongitude: { type: Number },
  deliveryAddress: { type: String, default: "" },
  deliveryLatitude: { type: Number },
  deliveryLongitude: { type: Number },
  agentCurrentLatitude: { type: Number },
  agentCurrentLongitude: { type: Number },
  
  deliveryType: { type: String, enum: ["standard", "express", "farm_pickup"], default: "standard" },
  deliveryTime: { type: String, default: "asap" },
  deliveryDistance: { type: Number, default: 0 }, // in km
  estimatedDeliveryMinutes: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  billNumber: { type: String, default: "" },
  timeline: [timelineSchema],

  // ─── Product Verification Security ───
  verificationCode: { type: String, default: "" }, // 6-digit code shared with customer
  productSnapshot: { type: productSnapshotSchema }, // snapshot of crop at order time
  agentVerified: { type: Boolean, default: false }, // agent confirmed product matches
  isReported: { type: Boolean, default: false }, // agent reported product mismatch
  agentReportReason: { type: String, default: "" }, // reason for mismatch report
  reportResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who resolved
  reportResolution: { type: String, enum: ["pending", "penalized", "dismissed"], default: "pending" },

  // ─── Post-Delivery Review ───
  reviewText: { type: String, default: "" },
  sentimentScore: { type: Number, default: 0 },
  reviewSentiment: { type: String, enum: ["Positive", "Neutral", "Negative", ""], default: "" },

  // ─── Financial Ledger ───
  isSettledWithFarmer: { type: Boolean, default: false },
  isSettledWithAgent: { type: Boolean, default: false },
  adminRevenue: { type: Number, default: 0 }
}, { timestamps: true });

// Auto-generate bill number
orderSchema.pre("save", function(next) {
  if (!this.billNumber) {
    this.billNumber = "RS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  // Auto-generate verification code
  if (!this.verificationCode) {
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

export default mongoose.model("Order", orderSchema);