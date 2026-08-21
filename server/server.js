require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const billRoutes = require("./routes/billRoutes");

const pool = require("./config/db");

const app = express();

app.use(cors({
    origin: "http://localhost:3000"
}));
app.use(express.json());


app.use("/api/products", productRoutes);
app.use("/api/bill", billRoutes);
app.use("/api/bill-settings", billRoutes);
// Test server
app.get("/", (req, res) => {
    res.json({
        message: "Cafe App API is running"
    });
});


// Test database connection
app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS result");

        res.json({
            message: "MySQL connection successful",
            data: rows
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/orders", orderRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});