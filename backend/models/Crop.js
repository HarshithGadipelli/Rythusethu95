import mongoose from "mongoose";

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  category: {
    type: String,
    enum: ["vegetable", "fruit", "grain", "pulse", "spice", "dairy", "byproduct", "other"],
    default: "vegetable"
  },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: "kg", enum: ["kg", "g", "litre", "piece", "dozen", "bale", "tonne"] },
  minOrderQty: { type: Number, default: 1 },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  image: { type: String, default: "" },
  images: [{ type: String }],
  location: { type: String, default: "" }, // Product Location
  farmLocation: { type: String, default: "" }, // Farm Location
  latitude: { type: Number },
  longitude: { type: Number },
  farmTourUrl: { type: String, default: "" },
  farmTourVideo: { type: String, default: "" },
  harvestDate: { type: Date },
  expiryDate: { type: Date },
  season: { type: String, enum: ["kharif", "rabi", "zaid", "perennial"], default: "kharif" },
  isOrganic: { type: Boolean, default: false },
  certificationStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
  certificationDocument: { type: String, default: "" },
  isPesticideFree: { type: Boolean, default: false },
  qualityGrade: { type: String, enum: ["A", "B", "C", null], default: null },
  isLive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isPrebooking: { type: Boolean, default: false },
  isBulk: { type: Boolean, default: false },
  lifecycleStage: { type: String, enum: ["sowing", "vegetative", "flowering", "harvesting", "post_harvest", "ready"], default: "sowing" },
  lifecycleUpdates: [{
    stage: { type: String, enum: ["sowing", "vegetative", "flowering", "harvesting", "post_harvest", "ready"] },
    imageUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  }],
  nutritionInfo: {
    calories: Number,
    carbs: Number,
    protein: Number,
    fat: Number,
    fiber: Number
  },
  rating: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Crop", cropSchema);