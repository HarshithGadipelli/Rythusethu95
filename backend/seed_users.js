import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import Farmer from "./models/Farmer.js";
import Agent from "./models/Agent.js";
import Customer from "./models/Customer.js";

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rythu_sethu");
    console.log("Connected to DB");

    const pass = await bcrypt.hash("test123", 10);

    // Seed Farmer
    let farmer = await User.findOne({ email: "farmer@test.com" });
    if (!farmer) {
      farmer = await User.create({ name: "Test Farmer", email: "farmer@test.com", password: pass, role: "farmer", phone: "9876543210", location: "Hyderabad", latitude: 17.385, longitude: 78.486, isVerified: true });
      await Farmer.create({ user: farmer._id, farmName: "Green Acres", farmSize: 5 });
      console.log("Seeded farmer@test.com");
    }

    // Seed Agent
    let agent = await User.findOne({ email: "agent@test.com" });
    if (!agent) {
      agent = await User.create({ name: "Test Agent", email: "agent@test.com", password: pass, role: "agent", phone: "9999999999", location: "Hyderabad", isVerified: true });
      await Agent.create({ user: agent._id, vehicle: "truck" });
      console.log("Seeded agent@test.com");
    }

    // Seed Customer
    let customer = await User.findOne({ email: "customer@test.com" });
    if (!customer) {
      customer = await User.create({ name: "Test Customer", email: "customer@test.com", password: pass, role: "customer", phone: "8888888888", location: "Hyderabad", isVerified: true });
      await Customer.create({ user: customer._id });
      console.log("Seeded customer@test.com");
    }

    // Seed Admin
    let admin = await User.findOne({ email: "admin@test.com" });
    if (!admin) {
      admin = await User.create({ name: "Test Admin", email: "admin@test.com", password: pass, role: "admin", phone: "7777777777", location: "Hyderabad", isVerified: true });
      console.log("Seeded admin@test.com");
    }

    console.log("Seed complete");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

seed();
