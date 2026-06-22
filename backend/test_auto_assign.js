import mongoose from "mongoose";
import User from "./models/User.js";
import Order from "./models/Order.js";

async function test() {
  await mongoose.connect("mongodb://127.0.0.1:27017/rythu_sethu");
  const farmer = await User.findOne({ email: "farmer@test.com" });
  const cust = await User.findOne({ email: "customer@test.com" });
  
  const req = {
    quantity: 1,
    totalAmount: 100,
    deliveryType: "standard",
    customer: cust._id,
    farmer: farmer._id,
    deliveryLatitude: 17.4,
    deliveryLongitude: 78.5
  };
  
  console.log("Creating order...");
  const res = await fetch("http://localhost:5000/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  
  const data = await res.json();
  console.log("Order created:", data._id);
  
  await new Promise(r => setTimeout(r, 1000));
  
  const updatedOrder = await Order.findById(data._id).populate("agent");
  console.log("Order status:", updatedOrder.status, "Agent:", updatedOrder.agent?.name || "None");
  process.exit();
}
test();
