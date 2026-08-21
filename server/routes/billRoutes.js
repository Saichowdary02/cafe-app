const express = require("express");
const {
    getBillSettings,
    updateBillSettings,
} = require("../controllers/billController");

const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Public: GET /api/bill/settings (or /api/bill-settings)
router.get("/settings", getBillSettings);
router.get("/", getBillSettings);

// Admin only: PUT /api/bill/settings (or /api/bill-settings)
router.put(
    "/settings",
    authenticateToken,
    authorizeRoles("ADMIN"),
    updateBillSettings
);
router.put(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN"),
    updateBillSettings
);

module.exports = router;
