import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["farmer", "customer", "agent"], required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  status: { type: String, enum: ["open", "in-progress", "resolved", "closed"], default: "open" },
  responses: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      senderName: String,
      message: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Ticket", ticketSchema);
