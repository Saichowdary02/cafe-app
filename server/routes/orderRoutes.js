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
    authorizeRoles("STAFF","ADMIN"),
    getAllOrders
);
// Staff/Admin update order status
router.patch(
    "/:id/status",
    authMiddleware,
    authorizeRoles("STAFF", "ADMIN"),
    updateOrderStatus
);

// Staff/Admin confirm cash payment received
router.patch(
    "/:id/payment-status",
    authMiddleware,
    authorizeRoles("STAFF", "ADMIN"),
    updatePaymentStatus
);

module.exports = router;