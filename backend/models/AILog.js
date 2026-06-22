import mongoose from "mongoose";

const aiLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: { type: String, enum: ["farmer", "customer", "agent", "admin"] },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  contextUsed: { type: mongoose.Schema.Types.Mixed },
  satisfactionScore: { type: Number, min: 1, max: 5 }, // Rated by user
  feedback: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("AILog", aiLogSchema);
