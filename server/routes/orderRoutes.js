const express = require("express");

const router = express.Router();

const {
    createOrder,getMyOrders, getAllOrders,updateOrderStatus,updatePaymentStatus
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Create a new order
router.post("/", authMiddleware, createOrder);
router.get(
    "/my-orders",
    authMiddleware,
    getMyOrders
);
// Staff gets all orders
router.get(
    "/",
    authMiddleware,
    authorizeRoles("KITCHEN","ADMIN"),
    getAllOrders
);
// Staff/Admin update order status
router.patch(
    "/:id/status",
    authMiddleware,
    authorizeRoles("KITCHEN", "ADMIN"),
    updateOrderStatus
);

// Admin confirms cash payment received (delivery boys use /api/delivery/orders/:id/payment-status
// which is restricted to their own assigned orders)
router.patch(
    "/:id/payment-status",
    authMiddleware,
    authorizeRoles("ADMIN"),
    updatePaymentStatus
);

module.exports = router;
