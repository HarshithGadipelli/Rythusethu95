import express from "express";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) ? new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
}) : null;

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    res.json(payment);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

router.get("/history/:orderId", async (req, res) => {
  try {
    const payments = await Payment.find({ order: req.params.orderId });
    res.json(payments);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

// Create Razorpay Order
router.post("/razorpay/create-order", async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: "Payment gateway is not configured properly." });
    }

    const { amount, currency = "INR", orderId, customerId } = req.body;
    
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_order_${orderId || Date.now()}`
    };

    const rzpOrder = await razorpay.orders.create(options);
    if (!rzpOrder) return res.status(500).json({ error: "Some error occurred with Razorpay" });

    // Store pending payment record
    const paymentRecord = await Payment.create({
      order: orderId,
      customer: customerId,
      amount: amount,
      currency,
      method: "online",
      status: "pending",
      razorpayOrderId: rzpOrder.id
    });

    res.json({ ...rzpOrder, paymentRecordId: paymentRecord._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay Payment
router.post("/razorpay/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, paymentRecordId } = req.body;

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, error: "Payment gateway misconfigured." });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Update Payment record
      if (paymentRecordId) {
        await Payment.findByIdAndUpdate(paymentRecordId, {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date()
        });
      }

      // Update Order Status
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          $push: { timeline: { status: "paid", note: "Online payment successful via Razorpay" } }
        });
      }

      return res.status(200).json({ message: "Payment verified successfully" });
    } else {
      // Update Payment record as failed
      if (paymentRecordId) {
        await Payment.findByIdAndUpdate(paymentRecordId, { status: "failed" });
      }
      return res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
