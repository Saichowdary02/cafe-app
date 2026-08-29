const bcrypt = require("bcrypt");
const pool = require("../config/db");

// Roles that ADMIN can manage through the staff APIs
const MANAGEABLE_ROLES = ["STAFF", "DELIVERY"];

const resolveRoleFilter = (requestedRole) =>
    requestedRole && MANAGEABLE_ROLES.includes(requestedRole)
        ? requestedRole
        : "STAFF";

// GET /api/staff — get all staff members (optional ?role=DELIVERY)
const getAllStaff = async (req, res) => {
    try {
        const roleFilter = resolveRoleFilter(req.query.role);
        const [rows] = await pool.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC",
            [roleFilter]
        );
        return res.status(200).json({ staff: rows });
    } catch (error) {
        console.error("Get all staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/staff/search?q=<name_or_id>&role=STAFF|DELIVERY — search by name or ID
const searchStaff = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({ message: "Search query is required" });
        }

        const roleFilter = resolveRoleFilter(req.query.role);
        const searchTerm = q.trim();
        const isNumeric = /^\d+$/.test(searchTerm);

        let rows;
        if (isNumeric) {
            // Search by ID or name
            [rows] = await pool.execute(
                "SELECT id, name, email, role, created_at FROM users WHERE role = ? AND (id = ? OR name LIKE ?)",
                [roleFilter, parseInt(searchTerm), `%${searchTerm}%`]
            );
        } else {
            // Search by name only
            [rows] = await pool.execute(
                "SELECT id, name, email, role, created_at FROM users WHERE role = ? AND name LIKE ?",
                [roleFilter, `%${searchTerm}%`]
            );
        }

        return res.status(200).json({ staff: rows });
    } catch (error) {
        console.error("Search staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/staff/:id?role=STAFF|DELIVERY — get a single member by ID
const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const roleFilter = resolveRoleFilter(req.query.role);

        const [rows] = await pool.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ? AND role = ?",
            [id, roleFilter]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        return res.status(200).json({ staff: rows[0] });
    } catch (error) {
        console.error("Get staff by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/staff — create a new staff or delivery member
const createStaff = async (req, res) => {
    try {
        const { name, email, password, role: requestedRole } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Role: STAFF (default) or DELIVERY
        const role =
            requestedRole && MANAGEABLE_ROLES.includes(requestedRole)
                ? requestedRole
                : "STAFF";

        // Check if email already exists
        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        // Hash password and insert
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, role]
        );

        return res.status(201).json({
            message: role === "DELIVERY"
                ? "Delivery member created successfully"
                : "Staff member created successfully",
            staff: {
                id: result.insertId,
                name,
                email,
                role
            }
        });
    } catch (error) {
        console.error("Create staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/staff/:id?role=STAFF|DELIVERY — delete by ID (role-guarded)
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const roleFilter = resolveRoleFilter(req.query.role);

        // Only delete if role is STAFF/DELIVERY (safety guard)
        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE id = ? AND role = ?",
            [id, roleFilter]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        await pool.execute(
            `UPDATE orders SET delivery_boy_id = NULL WHERE delivery_boy_id = ?`,
            [id]
        );
        await pool.execute("DELETE FROM users WHERE id = ? AND role = ?", [id, roleFilter]);

        return res.status(200).json({ message: "Staff member deleted successfully" });
    } catch (error) {
        console.error("Delete staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getAllStaff,
    searchStaff,
    getStaffById,
    createStaff,
    deleteStaff
};
