import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  farmName: { type: String, default: "" },
  farmLocation: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  farmSize: { type: Number, default: 0 }, // in acres
  soilType: { type: String, enum: ["clay", "sandy", "loamy", "silt", "peat", "chalk", "other"], default: "loamy" },
  cropTypes: [{ type: String }],
  experience: { type: Number, default: 0 }, // years
  bankAccount: { type: String, default: "" },
  upiId: { type: String, default: "" },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalSales: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  aadhaarVerified: { type: Boolean, default: false },
  profileImage: { type: String, default: "" },
  bio: { type: String, default: "" },
  profileCompleteness: { type: Number, default: 0 },
  responseRate: { type: Number, default: 0 },
  returnRate: { type: Number, default: 0 },
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  trustGrade: { type: String, default: "New", enum: ["Platinum", "Gold", "Silver", "Bronze", "New"] },
  farmTourEnabled: { type: Boolean, default: false },
  farmTourVerified: { type: Boolean, default: false },
  farmTourPrice: { type: Number, default: 0 },
  farmTourDetails: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Farmer", farmerSchema);