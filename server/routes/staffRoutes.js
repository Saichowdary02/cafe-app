const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const {
    getAllStaff,
    searchStaff,
    getStaffById,
    createStaff,
    deleteStaff
} = require("../controllers/staffController");

// All routes require authentication and ADMIN role
router.use(authenticateToken, authorizeRoles("ADMIN"));

router.get("/search", searchStaff);         // GET /api/staff/search?q=...
router.get("/", getAllStaff);               // GET /api/staff
router.get("/:id", getStaffById);          // GET /api/staff/:id
router.post("/", createStaff);             // POST /api/staff
router.delete("/:id", deleteStaff);        // DELETE /api/staff/:id

module.exports = router;
