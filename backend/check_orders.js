import mongoose from "mongoose";
import User from "./models/User.js";
import Order from "./models/Order.js";
import Crop from "./models/Crop.js";
import Delivery from "./models/Delivery.js";

function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function computeETA(distanceKm, vehicleType = "bike") { return Math.round((distanceKm / 25) * 60) + 15; }

async function testAutoAssign() {
  await mongoose.connect("mongodb://127.0.0.1:27017/rythu_sethu");
  const orderDoc = await Order.findOne({ status: "pending" });
  if (!orderDoc) { console.log("No pending order found."); return process.exit(); }
  console.log("Found order:", orderDoc._id, "deliveryType:", orderDoc.deliveryType, "status:", orderDoc.status);
  
  if (orderDoc.deliveryType === "farm_pickup" || orderDoc.status !== "pending") { console.log("Failed condition 1"); return process.exit(); }
    
  let pickupLat = 0, pickupLng = 0;
  if (orderDoc.farmer) {
    const farmer = await User.findById(orderDoc.farmer);
    pickupLat = farmer?.latitude || 0;
    pickupLng = farmer?.longitude || 0;
    console.log("Farmer found, lat:", pickupLat, "lng:", pickupLng);
  }
  if (pickupLat === 0 && pickupLng === 0) { console.log("Failed condition 2: pickup coords 0"); return process.exit(); }

  const agents = await User.find({ role: "agent", isActive: true });
  console.log("Found agents:", agents.length);
  if (!agents.length) { console.log("Failed condition 3: no agents"); return process.exit(); }

  const scoredAgents = agents.map(agent => {
    const dist = haversineDistance(agent.latitude || 0, agent.longitude || 0, pickupLat, pickupLng);
    const score = (dist * 10) - (agent.deliveryScore || 0);
    return { agent, dist, score };
  });

  scoredAgents.sort((a, b) => a.score - b.score);
  const bestAgentData = scoredAgents[0];
  const bestAgent = bestAgentData.agent;
  console.log("Best agent:", bestAgent.name, "Dist:", bestAgentData.dist);

  console.log("Would assign to:", bestAgent.name);
  process.exit();
}
testAutoAssign();
