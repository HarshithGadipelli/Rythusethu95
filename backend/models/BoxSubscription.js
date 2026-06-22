import mongoose from "mongoose";

const boxSubscriptionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  boxType: { type: String, required: true }, // e.g. "Family Veggie Box"
  price: { type: Number, required: true },
  frequency: { type: String, enum: ["weekly", "biweekly", "monthly"], required: true },
  status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
  nextDeliveryDate: { type: Date, required: true },
  deliveryAddress: { type: String, required: true },
  history: [{
    dateDelivered: { type: Date },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }
  }]
}, { timestamps: true });

export default mongoose.model("BoxSubscription", boxSubscriptionSchema);
