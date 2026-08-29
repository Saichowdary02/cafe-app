const pool = require("../config/db");

const ALLOWED_DELIVERY_STATUSES = ["OUT_FOR_DELIVERY", "COMPLETED"];

/*
 * GET /api/delivery/orders (DELIVERY role)
 * Returns the orders assigned to the logged-in delivery boy, newest first,
 * including customer info, delivery location and items.
 */
const getDeliveryOrders = async (req, res) => {
    try {
        const deliveryBoyId = req.user.id;

        const [orders] = await pool.execute(
            `SELECT
                o.id,
                o.user_id,
                u.name  AS customer_name,
                u.email AS customer_email,
                o.total_amount,
                o.status,
                o.payment_mode,
                o.payment_status,
                o.delivery_address,
                o.latitude,
                o.longitude,
                o.created_at
             FROM orders o
             INNER JOIN users u
                ON o.user_id = u.id
             WHERE o.delivery_boy_id = ?
             ORDER BY o.created_at DESC`,
            [deliveryBoyId]
        );

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

        return res.status(200).json({
            message: "Deliveries retrieved successfully",
            orders
        });
    } catch (error) {
        console.error("Get delivery orders error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/*
 * PATCH /api/delivery/orders/:id/assign (ADMIN role)
 * Body: { "delivery_boy_id": 4 }
 * Assigns (or re-assigns) a DELIVERY user to an order.
 */
const assignDeliveryBoy = async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_boy_id } = req.body;

        if (!delivery_boy_id) {
            return res.status(400).json({ message: "delivery_boy_id is required" });
        }

        // The assignee must be a DELIVERY user
        const [deliveryUsers] = await pool.execute(
            "SELECT id, name FROM users WHERE id = ? AND role = 'DELIVERY'",
            [delivery_boy_id]
        );

        if (deliveryUsers.length === 0) {
            return res.status(400).json({ message: "Selected user is not a delivery member" });
        }

        const [orders] = await pool.execute(
            "SELECT id FROM orders WHERE id = ?",
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        await pool.execute(
            "UPDATE orders SET delivery_boy_id = ? WHERE id = ?",
            [delivery_boy_id, id]
        );

        return res.status(200).json({
            message: "Delivery boy assigned successfully",
            order: {
                id: Number(id),
                delivery_boy_id: Number(delivery_boy_id),
                delivery_boy_name: deliveryUsers[0].name
            }
        });
    } catch (error) {
        console.error("Assign delivery boy error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/*
 * PATCH /api/delivery/orders/:id/status (DELIVERY role)
 * Body: { "status": "OUT_FOR_DELIVERY" | "COMPLETED" }
 * The delivery boy can only update orders assigned to them.
 */
const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        if (!ALLOWED_DELIVERY_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Allowed: OUT_FOR_DELIVERY, COMPLETED"
            });
        }

        const [orders] = await pool.execute(
            `SELECT id, status FROM orders WHERE id = ? AND delivery_boy_id = ?`,
            [id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found or not assigned to you"
            });
        }

        const order = orders[0];

        if (order.status === "COMPLETED") {
            return res.status(400).json({ message: "Completed order cannot be changed" });
        }

        if (status === "OUT_FOR_DELIVERY" && order.status !== "PREPARING" && order.status !== "READY_FOR_DELIVERY") {
            return res.status(400).json({
                message: "Order can only go out for delivery after PREPARING"
            });
        }

        if (status === "COMPLETED" && order.status !== "OUT_FOR_DELIVERY" && order.status !== "READY_FOR_DELIVERY" && order.status !== "PREPARING") {
            return res.status(400).json({
                message: "Invalid status transition"
            });
        }

        await pool.execute(
            "UPDATE orders SET status = ? WHERE id = ?",
            [status, id]
        );

        return res.status(200).json({
            message: "Delivery status updated successfully",
            order: { id: Number(id), status }
        });
    } catch (error) {
        console.error("Update delivery status error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getDeliveryOrders,
    assignDeliveryBoy,
    updateDeliveryStatus
};
