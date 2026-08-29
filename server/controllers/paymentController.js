const crypto = require("crypto");
const pool = require("../config/db");
const razorpay = require("../config/razorpay");

/*
 * Creates a Razorpay order for an existing
 * app order (amount is taken from the DB,
 * never trusted from the client).
 */
const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { order_id } = req.body;

        // Kitchen and delivery members cannot initiate payments
        if (req.user.role === "KITCHEN" || req.user.role === "DELIVERY") {
            return res.status(403).json({
                message: "Kitchen and delivery members cannot place orders"
            });
        }

        if (!order_id) {
            return res.status(400).json({
                message: "order_id is required"
            });
        }

        // 1. Find the order and make sure it belongs to this user
        const [orders] = await pool.execute(
            `SELECT id, user_id, total_amount, status
             FROM orders
             WHERE id = ?`,
            [order_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const order = orders[0];

        if (order.user_id !== userId) {
            return res.status(403).json({
                message: "This order does not belong to you"
            });
        }

        // 2. Amount must be in the smallest currency unit (paise)
        const amountInPaise = Math.round(Number(order.total_amount) * 100);

        if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({
                message: "Invalid order amount"
            });
        }

        // 3. Create order in Razorpay
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `order_rcpt_${order.id}`,
            notes: {
                app_order_id: String(order.id),
                user_id: String(userId)
            }
        });

        // 4. Remember that this order is being paid online
        try {
            await pool.execute(
                `INSERT INTO payments
                (order_id, method, razorpay_order_id, amount, status)
                VALUES (?, 'RAZORPAY', ?, ?, 'PENDING')`,
                [order.id, razorpayOrder.id, Number(order.total_amount)]
            );
        } catch (dbError) {
            console.error("Failed to record pending payment:", dbError.message);
        }

        // 5. Send checkout details to client
        return res.status(201).json({
            message: "Razorpay order created",
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
            app_order_id: order.id
        });

    } catch (error) {

        console.error("Create razorpay order error:", error);

        return res.status(500).json({
            message: "Failed to initiate payment"
        });
    }
};

/*
 * Verifies the Razorpay signature after checkout
 * and marks the payment (and order) as paid.
 */
const verifyPayment = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                message: "Missing payment verification fields"
            });
        }

        // 1. Make sure the order belongs to this user
        const [orders] = await pool.execute(
            `SELECT id, user_id FROM orders WHERE id = ?`,
            [order_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (orders[0].user_id !== userId) {
            return res.status(403).json({
                message: "This order does not belong to you"
            });
        }

        // 2. Verify signature: HMAC_SHA256(razorpay_order_id|razorpay_payment_id, secret)
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("Razorpay signature mismatch for order", order_id);

            await pool.execute(
                `UPDATE payments
                 SET status = 'FAILED'
                 WHERE razorpay_order_id = ?`,
                [razorpay_order_id]
            ).catch(() => {});

            await pool.execute(
                `UPDATE orders
                 SET payment_status = 'FAILED'
                 WHERE id = ?`,
                [order_id]
            ).catch(() => {});

            return res.status(400).json({
                message: "Payment verification failed"
            });
        }

        // 3. Mark payment as SUCCESS and the order as PAID
        try {
            const [result] = await pool.execute(
                `UPDATE payments
                 SET razorpay_payment_id = ?,
                     razorpay_signature = ?,
                     status = 'SUCCESS'
                 WHERE razorpay_order_id = ?`,
                [razorpay_payment_id, razorpay_signature, razorpay_order_id]
            );

            // No row updated (pending insert failed earlier) -> insert now
            if (result.affectedRows === 0) {
                const [orderRow] = await pool.execute(
                    `SELECT total_amount FROM orders WHERE id = ?`,
                    [order_id]
                );

                await pool.execute(
                    `INSERT INTO payments
                    (order_id, method, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status)
                    VALUES (?, 'RAZORPAY', ?, ?, ?, ?, 'SUCCESS')`,
                    [
                        order_id,
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature,
                        Number(orderRow[0]?.total_amount || 0)
                    ]
                );
            }

            await pool.execute(
                `UPDATE orders
                 SET payment_status = 'PAID'
                 WHERE id = ?`,
                [order_id]
            );
        } catch (dbError) {
            console.error("Failed to update payment record:", dbError.message);
        }

        // 4. Send response
        return res.status(200).json({
            message: "Payment verified successfully",
            payment_id: razorpay_payment_id,
            order_id: Number(order_id),
            status: "PAID"
        });

    } catch (error) {

        console.error("Verify payment error:", error);

        return res.status(500).json({
            message: "Payment verification failed"
        });
    }
};

/*
 * Called by the frontend when Razorpay checkout
 * reports a failed payment. Marks the order's
 * payment_status as FAILED.
 */
const markPaymentFailed = async (req, res) => {
    try {
        const userId = req.user.id;

        const { order_id, razorpay_order_id, reason } = req.body;

        if (!order_id) {
            return res.status(400).json({
                message: "order_id is required"
            });
        }

        // 1. Make sure the order belongs to this user
        const [orders] = await pool.execute(
            `SELECT id, user_id FROM orders WHERE id = ?`,
            [order_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (orders[0].user_id !== userId) {
            return res.status(403).json({
                message: "This order does not belong to you"
            });
        }

        // 2. Mark order payment as FAILED
        await pool.execute(
            `UPDATE orders
             SET payment_status = 'FAILED'
             WHERE id = ?`,
            [order_id]
        );

        // 3. Mark payment record as FAILED (best effort)
        if (razorpay_order_id) {
            await pool.execute(
                `UPDATE payments
                 SET status = 'FAILED'
                 WHERE razorpay_order_id = ?`,
                [razorpay_order_id]
            ).catch(() => {});
        }

        console.error(
            `Payment failed for order ${order_id}: ${reason || "unknown reason"}`
        );

        // 4. Send response
        return res.status(200).json({
            message: "Payment marked as failed",
            order_id: Number(order_id),
            payment_status: "FAILED"
        });

    } catch (error) {

        console.error("Mark payment failed error:", error);

        return res.status(500).json({
            message: "Failed to record payment failure"
        });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    markPaymentFailed
};
