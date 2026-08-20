const pool = require("../config/db");

const createOrder = async (req, res) => {
    let connection;

    try {
        const { items } = req.body;

        // 1. Get logged-in user's ID from JWT
        const userId = req.user.id;

        // 2. Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Order must contain at least one item"
            });
        }

        // 3. Get database connection for transaction
        connection = await pool.getConnection();

        // 4. Start transaction
        await connection.beginTransaction();

        let totalAmount = 0;
        const orderItems = [];

        // 5. Check every product
        for (const item of items) {

            const { product_id, quantity } = item;

            // Validate product and quantity
            if (!product_id || !quantity || quantity <= 0) {
                await connection.rollback();

                return res.status(400).json({
                    message: "Invalid product or quantity"
                });
            }

            // Get product from database
            const [products] = await connection.execute(
                "SELECT id, name, price FROM products WHERE id = ?",
                [product_id]
            );

            // Product doesn't exist
            if (products.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    message: `Product with id ${product_id} not found`
                });
            }

            const product = products[0];

            // Get price from database
            const price = Number(product.price);

            // Calculate subtotal
            const subtotal = price * quantity;

            // Add to total
            totalAmount += subtotal;

            // Store order item information
            orderItems.push({
                product_id: product.id,
                quantity,
                price
            });
        }

        // 6. Create order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders
            (user_id, total_amount, status)
            VALUES (?, ?, ?)`,
            [userId, totalAmount, "PENDING"]
        );

        const orderId = orderResult.insertId;

        // 7. Insert order items
        for (const item of orderItems) {

            await connection.execute(
                `INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price
                ]
            );
        }

        // 8. Commit transaction
        await connection.commit();

        // 9. Send response
        return res.status(201).json({
            message: "Order created successfully",
            order: {
                id: orderId,
                user_id: userId,
                total_amount: totalAmount,
                status: "PENDING"
            }
        });

    } catch (error) {

        // Rollback if something goes wrong
        if (connection) {
            await connection.rollback();
        }

        console.error("Create order error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });

    } finally {

        // Release connection
        if (connection) {
            connection.release();
        }
    }
};
const getMyOrders = async (req, res) => {
    try {

        // 1. Get logged-in user's ID from JWT
        const userId = req.user.id;

        // 2. Get user's orders
        const [orders] = await pool.execute(
            `SELECT
                id,
                user_id,
                total_amount,
                status,
                created_at
             FROM orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        // 3. Get items for each order
        for (const order of orders) {

            const [items] = await pool.execute(
                `SELECT
                    oi.id,
                    oi.product_id,
                    COALESCE(p.name, 'Item') AS name,
                    oi.quantity,
                    oi.price
                 FROM order_items oi
                 LEFT JOIN products p
                    ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );

            order.items = items;
        }

        // 4. Send response
        return res.status(200).json({
            message: "Orders retrieved successfully",
            orders
        });

    } catch (error) {

        console.error("Get my orders error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
const getAllOrders = async (req, res) => {
    try {

        // Get all orders with customer information
        const [orders] = await pool.execute(
            `SELECT
                o.id,
                o.user_id,
                u.name AS user_name,
                u.email AS user_email,
                o.total_amount,
                o.status,
                o.created_at
             FROM orders o
             INNER JOIN users u
                ON o.user_id = u.id
             ORDER BY o.created_at DESC`
        );


        // Get items for each order
        for (const order of orders) {

            const [items] = await pool.execute(
                `SELECT
                    oi.id,
                    oi.product_id,
                    COALESCE(p.name, 'Item') AS product_name,
                    oi.quantity,
                    oi.price
                 FROM order_items oi
                 LEFT JOIN products p
                    ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );

            order.items = items;
        }


        // Send response
        return res.status(200).json({
            message: "Orders retrieved successfully",
            orders
        });

    } catch (error) {

        console.error("Get all orders error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
const updateOrderStatus = async (req, res) => {
    try {

        // 1. Get order ID from URL
        const { id } = req.params;

        // 2. Get requested status
        const { status } = req.body;

        // 3. Validate status
        if (!status) {
            return res.status(400).json({
                message: "Status is required"
            });
        }

        // 4. Only allow these statuses
        const allowedStatuses = [
            "PREPARING",
            "COMPLETED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        // 5. Find the order
        const [orders] = await pool.execute(
            `SELECT id, status
             FROM orders
             WHERE id = ?`,
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const order = orders[0];

        // 6. Validate status transition

        // PENDING → PREPARING
        if (
            order.status === "PENDING" &&
            status !== "PREPARING"
        ) {
            return res.status(400).json({
                message: "Pending order can only be moved to PREPARING"
            });
        }

        // PREPARING → COMPLETED
        if (
            order.status === "PREPARING" &&
            status !== "COMPLETED"
        ) {
            return res.status(400).json({
                message: "Preparing order can only be moved to COMPLETED"
            });
        }

        // COMPLETED cannot be changed
        if (order.status === "COMPLETED") {
            return res.status(400).json({
                message: "Completed order cannot be changed"
            });
        }

        // 7. Update order status
        await pool.execute(
            `UPDATE orders
             SET status = ?
             WHERE id = ?`,
            [status, id]
        );

        // 8. Send response
        return res.status(200).json({
            message: "Order status updated successfully",
            order: {
                id: Number(id),
                status
            }
        });

    } catch (error) {

        console.error("Update order status error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    createOrder,getMyOrders,getAllOrders,updateOrderStatus
};