import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
    quantity: { type: Number, required: true },
    priceAtAdd: { type: Number, required: true }
  }],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Cart", CartSchema);
