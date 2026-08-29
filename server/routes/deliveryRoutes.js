const express = require("express");

const router = express.Router();

const {
    getDeliveryOrders,
    assignDeliveryBoy,
    updateDeliveryStatus
} = require("../controllers/deliveryController");

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Delivery boy: orders assigned to him (with delivery location + items)
router.get(
    "/orders",
    authMiddleware,
    authorizeRoles("DELIVERY"),
    getDeliveryOrders
);

// Delivery boy: mark his assigned order OUT_FOR_DELIVERY / COMPLETED
router.patch(
    "/orders/:id/status",
    authMiddleware,
    authorizeRoles("DELIVERY"),
    updateDeliveryStatus
);

// Admin: assign a delivery boy to an order
router.patch(
    "/orders/:id/assign",
    authMiddleware,
    authorizeRoles("ADMIN"),
    assignDeliveryBoy
);

module.exports = router;
