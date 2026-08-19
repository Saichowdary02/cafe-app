const express = require("express");

const router = express.Router();

const {
    createOrder,getMyOrders, getAllOrders,updateOrderStatus
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

module.exports = router;