const pool = require("../config/db");

const ALLOWED_DELIVERY_STATUSES = ["OUT_FOR_DELIVERY", "DELIVERED"];

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
            "SELECT id, status FROM orders WHERE id = ?",
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        // A delivery boy can only be assigned once the kitchen has marked
        // the order READY_FOR_PICKUP (or it's already out/delivered).
        const allowedStatuses = ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"];
        if (!allowedStatuses.includes((orders[0].status || "").toUpperCase())) {
            return res.status(400).json({
                message: "Delivery boy can only be assigned after the order is Ready for Pickup"
            });
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
                message: "Invalid status. Allowed: OUT_FOR_DELIVERY, DELIVERED"
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

        if (order.status === "DELIVERED") {
            return res.status(400).json({ message: "Delivered order cannot be changed" });
        }

        if (status === "OUT_FOR_DELIVERY" && order.status !== "READY_FOR_PICKUP") {
            return res.status(400).json({
                message: "Order can only go out for delivery after READY_FOR_PICKUP"
            });
        }

        if (status === "DELIVERED" && order.status !== "OUT_FOR_DELIVERY" && order.status !== "READY_FOR_PICKUP") {
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

/*
 * PATCH /api/delivery/orders/:id/payment-status (DELIVERY role)
 * Body: { "payment_status": "PAID" }
 * The delivery boy marks a CASH order's payment as received after
 * completing the delivery. Only his own assigned cash orders, only
 * once the order is OUT_FOR_DELIVERY or DELIVERED.
 */
const markCashReceived = async (req, res) => {
    try {
        const { id } = req.params;

        const [orders] = await pool.execute(
            `SELECT id, total_amount, status, payment_mode, payment_status
             FROM orders
             WHERE id = ? AND delivery_boy_id = ?`,
            [id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found or not assigned to you"
            });
        }

        const order = orders[0];

        // Only cash orders are collected in person
        if (order.payment_mode !== "CASH") {
            return res.status(400).json({
                message: "Only CASH orders can be marked as received here"
            });
        }

        if (order.payment_status === "PAID") {
            return res.status(400).json({
                message: "This payment is already settled"
            });
        }

        // Cash can only be collected during/after the delivery run
        if (order.status !== "OUT_FOR_DELIVERY" && order.status !== "DELIVERED") {
            return res.status(400).json({
                message: "Cash can only be marked received once the order is out for delivery"
            });
        }

        await pool.execute(
            `UPDATE orders
             SET payment_status = 'PAID'
             WHERE id = ?`,
            [id]
        );

        // Record it in the payments table (best effort)
        try {
            await pool.execute(
                `INSERT INTO payments
                (order_id, method, amount, status)
                VALUES (?, 'CASH', ?, 'SUCCESS')`,
                [order.id, Number(order.total_amount)]
            );
        } catch (dbError) {
            console.error("Failed to record cash payment:", dbError.message);
        }

        return res.status(200).json({
            message: "Cash payment marked as received",
            order: {
                id: Number(id),
                payment_mode: "CASH",
                payment_status: "PAID"
            }
        });
    } catch (error) {
        console.error("Mark delivery cash received error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/*
 * POST /api/delivery/location (DELIVERY role)
 * Body: { "latitude": 17.3908, "longitude": 78.4831 }
 * The delivery boy's app pushes his GPS position here every ~10 sec
 * while an order is OUT_FOR_DELIVERY. The JWT identifies which
 * delivery boy the coordinates belong to (never trust a body ID).
 * The single row per boy is upserted, so the table always answers
 * "where is this delivery boy right now?" — no GPS history is kept.
 */
const updateMyLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        // 1. Validate coordinates (same rules as order delivery location)
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180
        ) {
            return res.status(400).json({ message: "Invalid coordinates" });
        }

        // 2. Identify the delivery boy from the JWT
        const deliveryBoyId = req.user.id;

        // 3. Upsert the latest location (one row per delivery boy)
        await pool.execute(
            `INSERT INTO delivery_locations (delivery_boy_id, latitude, longitude)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
            [deliveryBoyId, lat, lng]
        );

        return res.status(200).json({ message: "Location updated" });
    } catch (error) {
        console.error("Update delivery location error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getDeliveryOrders,
    assignDeliveryBoy,
    updateDeliveryStatus,
    markCashReceived,
    updateMyLocation
};
