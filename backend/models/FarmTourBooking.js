import mongoose from "mongoose";

const farmTourBookingSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  numberOfPeople: { type: Number, required: true, default: 1 },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("FarmTourBooking", farmTourBookingSchema);
