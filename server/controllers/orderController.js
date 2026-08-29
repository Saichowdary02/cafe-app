const pool = require("../config/db");
const { calculateBillBreakdown, getActiveBillSettings } = require("./billController");

const createOrder = async (req, res) => {
    let connection;

    try {
        const { items, payment_mode, delivery_address, latitude, longitude } = req.body;

        // 1. Get logged-in user's ID from JWT
        const userId = req.user.id;

        // 1.02 Only customers (and admins) can place orders.
        // KITCHEN and DELIVERY members are operational roles, not customers.
        if (req.user.role === "KITCHEN" || req.user.role === "DELIVERY") {
            return res.status(403).json({
                message: "Kitchen and delivery members cannot place orders"
            });
        }

        // 1.05 Delivery location (optional but validated when provided)
        // latitude/longitude are the authoritative data; address is supplementary.
        let orderDeliveryAddress = null;
        let orderLatitude = null;
        let orderLongitude = null;

        if (
            delivery_address !== undefined ||
            latitude !== undefined ||
            longitude !== undefined
        ) {
            if (delivery_address !== undefined && delivery_address !== null) {
                if (typeof delivery_address !== "string" || delivery_address.trim() === "") {
                    return res.status(400).json({
                        message: "Invalid delivery address"
                    });
                }
                if (delivery_address.length > 500) {
                    return res.status(400).json({
                        message: "Delivery address must be 500 characters or less"
                    });
                }
                orderDeliveryAddress = delivery_address.trim();
            }

            const lat = Number(latitude);
            const lng = Number(longitude);

            // Both coordinates must be provided together and be within valid ranges
            if (
                latitude !== undefined || longitude !== undefined
            ) {
                if (
                    latitude === undefined ||
                    longitude === undefined ||
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng) ||
                    lat < -90 || lat > 90 ||
                    lng < -180 || lng > 180
                ) {
                    return res.status(400).json({
                        message: "Invalid delivery coordinates"
                    });
                }
                orderLatitude = lat;
                orderLongitude = lng;
            }
        }

        // 1.1 Payment mode: CASH (default) or ONLINE (Razorpay)
        const orderPaymentMode = payment_mode === "ONLINE" ? "ONLINE" : "CASH";

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

        let subtotal = 0;
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

            // Calculate item total
            const itemSubtotal = price * quantity;

            // Add to subtotal
            subtotal += itemSubtotal;

            // Store order item information
            orderItems.push({
                product_id: product.id,
                quantity,
                price
            });
        }

        // Fetch active bill settings and calculate final bill breakdown
        const billSettings = await getActiveBillSettings();
        const billBreakdown = calculateBillBreakdown(subtotal, billSettings);
        const finalGrandTotal = billBreakdown.grand_total;

        // 6. Create order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders
            (user_id, total_amount, status, payment_mode, payment_status, delivery_address, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, finalGrandTotal, "ORDER_PLACED", orderPaymentMode, "PENDING", orderDeliveryAddress, orderLatitude, orderLongitude]
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
                total_amount: finalGrandTotal,
                breakdown: billBreakdown,
                status: "PENDING",
                payment_mode: orderPaymentMode,
                payment_status: "PENDING",
                delivery_address: orderDeliveryAddress,
                latitude: orderLatitude,
                longitude: orderLongitude
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
                payment_mode,
                payment_status,
                delivery_address,
                latitude,
                longitude,
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

        // Get orders from the last 24 hours with customer information
        const [orders] = await pool.execute(
            `SELECT
                o.id,
                o.user_id,
                u.name AS user_name,
                u.email AS user_email,
                o.total_amount,
                o.status,
                o.payment_mode,
                o.payment_status,
                o.delivery_address,
                o.latitude,
                o.longitude,
                o.delivery_boy_id,
                db.name AS delivery_boy_name,
                o.created_at
             FROM orders o
             INNER JOIN users u
                ON o.user_id = u.id
             LEFT JOIN users db
                ON o.delivery_boy_id = db.id
             WHERE o.created_at >= NOW() - INTERVAL 24 HOUR
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

        // 4. Only allow these statuses (strict one-step flow)
        // Kitchen control: ORDER_PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP
        // OUT_FOR_DELIVERY / DELIVERED are normally set by the assigned delivery boy
        // via PATCH /api/delivery/orders/:id/status — but an ADMIN may also set them
        // here, provided a delivery boy is already assigned to the order.
        const isAdmin = req.user.role === "ADMIN";
        const allowedStatuses = [
            "CONFIRMED",
            "PREPARING",
            "READY_FOR_PICKUP",
            // Admin can also drive the delivery leg
            ...(isAdmin ? ["OUT_FOR_DELIVERY", "DELIVERED"] : [])
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message:
                    status === "OUT_FOR_DELIVERY" || status === "DELIVERED"
                        ? "Delivery statuses can only be updated by the assigned delivery boy"
                        : "Invalid status"
            });
        }

        // 5. Find the order
        const [orders] = await pool.execute(
            `SELECT id, status, payment_mode, payment_status, delivery_boy_id
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

        // 6. Validate status transition (one step at a time)

        // ORDER_PLACED → CONFIRMED
        if (order.status === "ORDER_PLACED" && status !== "CONFIRMED") {
            return res.status(400).json({
                message: "Order placed can only be moved to CONFIRMED"
            });
        }

        // ONLINE orders must be PAID before accepting (Razorpay verification).
        // CASH orders are cash-on-delivery: the delivery boy collects and marks
        // the cash as received after completing the delivery.
        if (
            order.status === "ORDER_PLACED" &&
            order.payment_mode === "ONLINE" &&
            (order.payment_status || "PENDING") !== "PAID"
        ) {
            return res.status(400).json({
                message: "Payment must be successful before accepting the order"
            });
        }

        // CONFIRMED → PREPARING
        if (order.status === "CONFIRMED" && status !== "PREPARING") {
            return res.status(400).json({
                message: "Confirmed order can only be moved to PREPARING"
            });
        }

        // PREPARING → READY_FOR_PICKUP
        if (order.status === "PREPARING" && status !== "READY_FOR_PICKUP") {
            return res.status(400).json({
                message: "Preparing order can only be moved to READY_FOR_PICKUP"
            });
        }

        // READY_FOR_PICKUP → OUT_FOR_DELIVERY (delivery boy only, via delivery API)
        if (order.status === "READY_FOR_PICKUP" && status !== "OUT_FOR_DELIVERY") {
            return res.status(400).json({
                message: "Ready for pickup order can only be moved to OUT_FOR_DELIVERY"
            });
        }

        // ── Admin-driven delivery leg (must stay in sync with the assigned delivery boy) ──
        // OUT_FOR_DELIVERY only from READY_FOR_PICKUP
        if (status === "OUT_FOR_DELIVERY" && order.status !== "READY_FOR_PICKUP") {
            return res.status(400).json({
                message: "Only a Ready for Pickup order can be moved to OUT_FOR_DELIVERY"
            });
        }

        // DELIVERED only from OUT_FOR_DELIVERY
        if (status === "DELIVERED" && order.status !== "OUT_FOR_DELIVERY") {
            return res.status(400).json({
                message: "Only an Out for Delivery order can be marked DELIVERED"
            });
        }

        // Admin can only move the delivery leg of an order that has a delivery boy assigned
        if ((status === "OUT_FOR_DELIVERY" || status === "DELIVERED") && !order.delivery_boy_id) {
            return res.status(400).json({
                message: "Assign a delivery boy before updating delivery statuses"
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

/*
 * Staff/Admin marks a CASH order's payment as received (PAID).
 * Online orders are managed automatically by the Razorpay flow.
 */
const updatePaymentStatus = async (req, res) => {
    try {
        // 1. Get order ID and requested payment status
        const { id } = req.params;
        const { payment_status } = req.body;

        // 2. Validate payment status
        if (!payment_status) {
            return res.status(400).json({
                message: "Payment status is required"
            });
        }

        // Staff can only confirm cash collection
        if (payment_status !== "PAID") {
            return res.status(400).json({
                message: "Only 'PAID' is allowed here"
            });
        }

        // 3. Find the order
        const [orders] = await pool.execute(
            `SELECT id, total_amount, payment_mode, payment_status
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

        // 4. Online payments cannot be changed manually
        if (order.payment_mode !== "CASH") {
            return res.status(400).json({
                message: "Online payments are managed automatically by Razorpay"
            });
        }

        // 5. Only pending cash payments can be marked paid
        if (order.payment_status !== "PENDING") {
            return res.status(400).json({
                message: "This payment is already settled"
            });
        }

        // 6. Mark cash as received
        await pool.execute(
            `UPDATE orders
             SET payment_status = 'PAID'
             WHERE id = ?`,
            [id]
        );

        // 7. Record it in the payments table (best effort)
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

        // 8. Send response
        return res.status(200).json({
            message: "Cash payment marked as received",
            order: {
                id: Number(id),
                payment_mode: "CASH",
                payment_status: "PAID"
            }
        });

    } catch (error) {

        console.error("Update payment status error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    createOrder,getMyOrders,getAllOrders,updateOrderStatus,updatePaymentStatus
};