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

// All routes require authentication.
// READ access: ADMIN + KITCHEN (kitchen needs the delivery-boy list to assign orders)
// WRITE access (create/delete members): ADMIN only
router.use(authenticateToken);

router.get("/search", authorizeRoles("ADMIN", "KITCHEN"), searchStaff);  // GET /api/staff/search?q=...
router.get("/", authorizeRoles("ADMIN", "KITCHEN"), getAllStaff);        // GET /api/staff
router.get("/:id", authorizeRoles("ADMIN", "KITCHEN"), getStaffById);    // GET /api/staff/:id
router.post("/", authorizeRoles("ADMIN"), createStaff);                  // POST /api/staff
router.delete("/:id", authorizeRoles("ADMIN"), deleteStaff);             // DELETE /api/staff/:id

module.exports = router;
