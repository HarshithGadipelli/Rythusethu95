import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  countryCode: { type: String, default: "+91" },
  role: {
    type: String,
    enum: ["farmer", "customer", "agent", "admin"],
    default: "customer"
  },
  language: { type: String, default: "en", enum: ["en", "te", "hi", "kn", "ta"] },
  location: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  
  // ─── Customer Specific Info ───
  customerType: { type: String, enum: ["individual", "business"], default: "individual" },
  requiresDailyDelivery: { type: Boolean, default: false },
  avatar: { type: String, default: "" },
  aadhaar: { type: String, default: "" },
  aadhaarImage: { type: String, default: "" },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  rewardPoints: { type: Number, default: 0 },
  experiencePoints: { type: Number, default: 0 },
  acceptedTerms: { type: Boolean, default: false },
  
  // ─── Trust & Strikes ───
  trustScore: { type: Number, default: 85 }, // Default high trust for new farmers
  deliveryScore: { type: Number, default: 0 }, // Specific to agents
  strikes: { type: Number, default: 0 },
  cancelledOrdersCount: { type: Number, default: 0 },
  accountStatus: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
  
  // ─── Farmer Specific Info ───
  farmName: { type: String, default: "" },
  
  // ─── Financial Ledger ───
  walletBalance: { type: Number, default: 0 }, // E.g., Delivery Agent accumulated earnings
  pendingSettlement: { type: Number, default: 0 }, // E.g., Owed to Farmer for sold crops
  cashInHand: { type: Number, default: 0 }, // COD cash collected by Delivery Agent (owed to Admin)
  escrowBalance: { type: Number, default: 0 }, // Funds held in escrow until delivery/tour completion
  
  upiId: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("User", userSchema);