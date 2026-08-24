const express = require("express");

const router = express.Router();

const {
    createRazorpayOrder,
    verifyPayment,
    markPaymentFailed
} = require("../controllers/paymentController");

const authMiddleware = require("../middleware/authMiddleware");

// Initiate online payment for an order
router.post("/create", authMiddleware, createRazorpayOrder);

// Verify payment after Razorpay checkout
router.post("/verify", authMiddleware, verifyPayment);

// Record a failed Razorpay payment
router.post("/failed", authMiddleware, markPaymentFailed);

module.exports = router;
