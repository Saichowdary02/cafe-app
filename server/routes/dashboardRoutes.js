const express = require("express");
const router = express.Router();

const { getDashboardStats } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// GET /api/dashboard/stats?period=1h|3h|24h|3d|7d
router.get(
    "/stats",
    authMiddleware,
    authorizeRoles("ADMIN"),
    getDashboardStats
);

module.exports = router;
