import mongoose from "mongoose";

const globalConfigSchema = new mongoose.Schema({
  isFestivalActive: { type: Boolean, default: false },
  discountPercentage: { type: Number, default: 10 },
  festivalMessage: { type: String, default: "Festival season is here! Enjoy 10% off." }
});

export default mongoose.model("GlobalConfig", globalConfigSchema);
