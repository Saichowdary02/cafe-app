const express = require("express");

const router = express.Router();

const {
    getDeliveryOrders,
    assignDeliveryBoy,
    updateDeliveryStatus,
    markCashReceived,
    updateMyLocation
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

// Delivery boy: collect cash for his assigned cash-on-delivery order
router.patch(
    "/orders/:id/payment-status",
    authMiddleware,
    authorizeRoles("DELIVERY"),
    markCashReceived
);

// Delivery boy: push live GPS location while out for delivery
router.post(
    "/location",
    authMiddleware,
    authorizeRoles("DELIVERY"),
    updateMyLocation
);

// Admin: assign a delivery boy to an order (kitchen can hand over ready orders too)
router.patch(
    "/orders/:id/assign",
    authMiddleware,
    authorizeRoles("ADMIN", "KITCHEN"),
    assignDeliveryBoy
);

module.exports = router;
