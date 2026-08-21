const bcrypt = require("bcrypt");
const pool = require("../config/db");

// GET /api/staff — get all staff members
const getAllStaff = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE role = 'STAFF' ORDER BY created_at DESC"
        );
        return res.status(200).json({ staff: rows });
    } catch (error) {
        console.error("Get all staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/staff/search?q=<name_or_id> — search staff by name or ID
const searchStaff = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({ message: "Search query is required" });
        }

        const searchTerm = q.trim();
        const isNumeric = /^\d+$/.test(searchTerm);

        let rows;
        if (isNumeric) {
            // Search by ID or name
            [rows] = await pool.execute(
                "SELECT id, name, email, role, created_at FROM users WHERE role = 'STAFF' AND (id = ? OR name LIKE ?)",
                [parseInt(searchTerm), `%${searchTerm}%`]
            );
        } else {
            // Search by name only
            [rows] = await pool.execute(
                "SELECT id, name, email, role, created_at FROM users WHERE role = 'STAFF' AND name LIKE ?",
                [`%${searchTerm}%`]
            );
        }

        return res.status(200).json({ staff: rows });
    } catch (error) {
        console.error("Search staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/staff/:id — get a single staff member by ID
const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ? AND role = 'STAFF'",
            [id]
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

// POST /api/staff — create a new staff member
const createStaff = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

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
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'STAFF')",
            [name, email, hashedPassword]
        );

        return res.status(201).json({
            message: "Staff member created successfully",
            staff: {
                id: result.insertId,
                name,
                email,
                role: "STAFF"
            }
        });
    } catch (error) {
        console.error("Create staff error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/staff/:id — delete a staff member by ID
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;

        // Only delete if role is STAFF (safety guard)
        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'STAFF'",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        await pool.execute("DELETE FROM users WHERE id = ? AND role = 'STAFF'", [id]);

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
