const pool = require("../config/db");

const getAllProducts = async (req, res) => {
    try {
        const [products] = await pool.execute(
            `SELECT id, name, image, price, description, category, created_at
             FROM products
             ORDER BY category, name`
        );

        res.status(200).json({
            products
        });

    } catch (error) {
        console.error("Get products error:", error);

        res.status(500).json({
            message: "Failed to fetch products"
        });
    }
};
const createProduct = async (req, res) => {
    try {
        const { name, price, category, image, description } = req.body;

        // Validate required fields
        if (!name || price === undefined || !category) {
            return res.status(400).json({
                message: "Name, price and category are required"
            });
        }

        // Validate price
        if (Number(price) < 0) {
            return res.status(400).json({
                message: "Price cannot be negative"
            });
        }

        // Validate category
        const allowedCategories = ["Chai", "Coffee", "Snacks"];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }

        // Validate description length
        if (description && String(description).length > 500) {
            return res.status(400).json({
                message: "Description cannot exceed 500 characters"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO products (name, price, description, category, image)
             VALUES (?, ?, ?, ?, ?)`,
            [name, price, description || null, category, image || null]
        );

        const [products] = await pool.execute(
            `SELECT id, name, image, price, description, category, created_at
             FROM products
             WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            message: "Product created successfully",
            product: products[0]
        });

    } catch (error) {
        console.error("Create product error:", error);

        return res.status(500).json({
            message: "Failed to create product"
        });
    }
};
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await pool.execute(
            `SELECT id, name, image, price, description, category, created_at
             FROM products
             WHERE id = ?`,
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            product: products[0]
        });

    } catch (error) {
        console.error("Get product error:", error);

        res.status(500).json({
            message: "Failed to fetch product"
        });
    }
};
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category, image, description } = req.body;

        // Check if product exists
        const [existingProducts] = await pool.execute(
            "SELECT id FROM products WHERE id = ?",
            [id]
        );

        if (existingProducts.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Validate required fields
        if (!name || price === undefined || !category) {
            return res.status(400).json({
                message: "Name, price and category are required"
            });
        }

        // Validate price
        if (Number(price) < 0) {
            return res.status(400).json({
                message: "Price cannot be negative"
            });
        }

        // Validate category
        const allowedCategories = ["Chai", "Coffee", "Snacks"];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }

        // Validate description length
        if (description && String(description).length > 500) {
            return res.status(400).json({
                message: "Description cannot exceed 500 characters"
            });
        }

        // Update product
        await pool.execute(
            `UPDATE products
             SET name = ?, price = ?, description = ?, category = ?, image = ?
             WHERE id = ?`,
            [
                name,
                price,
                description || null,
                category,
                image || null,
                id
            ]
        );

        // Get updated product
        const [products] = await pool.execute(
            `SELECT id, name, image, price, description, category, created_at
             FROM products
             WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            message: "Product updated successfully",
            product: products[0]
        });

    } catch (error) {
        console.error("Update product error:", error);

        return res.status(500).json({
            message: "Failed to update product"
        });
    }
};
const deleteProduct = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;

        // Check if product exists
        const [products] = await pool.execute(
            "SELECT id, name FROM products WHERE id = ?",
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Remove referenced order items first (handles case where foreign key lacks CASCADE in DB)
        await connection.execute(
            "DELETE FROM order_items WHERE product_id = ?",
            [id]
        );

        // Delete product
        await connection.execute(
            "DELETE FROM products WHERE id = ?",
            [id]
        );

        await connection.commit();

        return res.status(200).json({
            message: "Product deleted successfully",
            product: {
                id: products[0].id,
                name: products[0].name
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Delete product error:", error);

        return res.status(500).json({
            message: error.message || "Failed to delete product"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
module.exports = {
    getAllProducts,createProduct,getProductById,updateProduct,deleteProduct
};