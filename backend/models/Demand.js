import mongoose from "mongoose";

const demandSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  velocityScore: {
    type: Number,
    required: true,
    default: 0
  },
  totalSold: {
    type: Number,
    default: 0
  },
  orderCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  seasonBoostMultiplier: {
    type: Number,
    default: 1.0
  },
  finalScore: {
    type: Number,
    required: true,
    default: 0
  },
  evaluationWindowDays: {
    type: Number,
    default: 7
  }
}, { timestamps: true });

const Demand = mongoose.model("Demand", demandSchema);
export default Demand;
