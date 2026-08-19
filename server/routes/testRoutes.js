const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();


// Any logged-in user
router.get("/user", authenticateToken, (req, res) => {
    res.json({
        message: "You are authenticated",
        user: req.user
    });
});


// Only staff
router.get(
    "/staff",
    authenticateToken,
    authorizeRoles("STAFF"),
    (req, res) => {
        res.json({
            message: "Welcome Staff",
            user: req.user
        });
    }
);


// Only admin
router.get(
    "/admin",
    authenticateToken,
    authorizeRoles("ADMIN"),
    (req, res) => {
        res.json({
            message: "Welcome Admin",
            user: req.user
        });
    }
);

module.exports = router;