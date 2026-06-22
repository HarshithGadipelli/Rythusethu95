import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import Delivery from "./models/Delivery.js";

import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";
import cropRoutes from "./routes/cropRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import farmTourRoutes from "./routes/farmTourRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import ecommerceRoutes from "./routes/ecommerceRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Realtime client connected:", socket.id);
  
  socket.on("join_agent_room", (agentId) => {
    socket.join(`agent_${agentId}`);
  });

  socket.on("agent_location_update", async (data) => {
    // Broadcast the live update to the room immediately
    io.to(`agent_${data.agentId}`).emit("agent_location_changed", data);

    // Persist to MongoDB realistically in the background
    try {
      if (data.agentId && data.lat && data.lng) {
        await Delivery.updateMany(
          { agent: data.agentId, status: "in_transit" },
          { 
            $set: { 
              agentLatitude: data.lat, 
              agentLongitude: data.lng,
              lastLocationUpdate: new Date()
            }
          }
        );
      }
    } catch (err) {
      console.error("Failed to update live delivery location to DB", err);
    }
  });

  socket.on("admin_broadcast", (data) => {
    io.emit("admin_broadcast_received", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Realtime client disconnected:", socket.id);
  });
});

connectDB();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/tours", farmTourRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/shop", ecommerceRoutes);
app.use("/api/auctions", auctionRoutes);

app.get("/", (req, res) => {
  res.send("🌾 Rythu Sethu 4.0 Backend Running");
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});