const pool = require("../config/db");

/**
 * GET /api/dashboard/stats?period=1h|3h|24h|3d|7d
 *
 * Returns aggregated order stats for the requested time window,
 * plus Category Performance and Peak Hours analytics.
 */

// Allowed periods (yesterday removed as per requirements)
const PERIOD_FILTERS = {
    "1h":  "o.created_at >= NOW() - INTERVAL 1 HOUR",
    "3h":  "o.created_at >= NOW() - INTERVAL 3 HOUR",
    "24h": "o.created_at >= NOW() - INTERVAL 24 HOUR",
    "3d":  "o.created_at >= NOW() - INTERVAL 3 DAY",
    "7d":  "o.created_at >= NOW() - INTERVAL 7 DAY",
};

// Peak Hours are only meaningful for longer windows
const PEAK_HOURS_PERIODS = ["24h", "3d", "7d"];

// Build a readable label for a 2-hour bucket (0 -> "12 AM – 2 AM")
const bucketLabel = (bucket) => {
    const fmt = (h) => {
        const normalized = h % 24;
        const suffix = normalized < 12 ? "AM" : "PM";
        const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
        return `${hour12} ${suffix}`;
    };
    return `${fmt(bucket * 2)} \u2013 ${fmt((bucket + 1) * 2)}`;
};

const getDashboardStats = async (req, res) => {
    try {
        const { period } = req.query;

        const activePeriod = PERIOD_FILTERS[period] ? period : "24h";
        const dateFilter = PERIOD_FILTERS[activePeriod];
        const showPeakHours = PEAK_HOURS_PERIODS.includes(activePeriod);

        // ── Query 1: Order counts + revenue ──
        const [statsRows] = await pool.execute(`
            SELECT
                COUNT(*)                                             AS total_orders,
                COALESCE(SUM(CASE WHEN o.status = 'ORDER_PLACED'      THEN 1 ELSE 0 END), 0) AS order_placed,
                COALESCE(SUM(CASE WHEN o.status = 'CONFIRMED'         THEN 1 ELSE 0 END), 0) AS confirmed,
                COALESCE(SUM(CASE WHEN o.status = 'PREPARING'         THEN 1 ELSE 0 END), 0) AS preparing,
                COALESCE(SUM(CASE WHEN o.status = 'READY_FOR_PICKUP'  THEN 1 ELSE 0 END), 0) AS ready_for_pickup,
                COALESCE(SUM(CASE WHEN o.status = 'OUT_FOR_DELIVERY'  THEN 1 ELSE 0 END), 0) AS out_for_delivery,
                COALESCE(SUM(CASE WHEN o.status = 'DELIVERED'         THEN 1 ELSE 0 END), 0) AS delivered,
                COALESCE(SUM(o.total_amount), 0)                     AS total_revenue,
                COALESCE(AVG(o.total_amount), 0)                     AS avg_order_value
            FROM orders o
            WHERE ${dateFilter}
        `);

        const stats = statsRows[0];

        // ── Query 2: Top 5 best-selling products ──
        const [topProducts] = await pool.execute(`
            SELECT
                p.name,
                SUM(oi.quantity) AS quantity_sold
            FROM order_items oi
            INNER JOIN orders o   ON oi.order_id   = o.id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE ${dateFilter}
            GROUP BY p.id, p.name
            ORDER BY quantity_sold DESC
            LIMIT 5
        `);

        // ── Query 3: Category performance (quantity + revenue per category) ──
        const [categoryRows] = await pool.execute(`
            SELECT
                p.category,
                SUM(oi.quantity)                          AS items_sold,
                COALESCE(SUM(oi.quantity * oi.price), 0)  AS revenue,
                COUNT(DISTINCT oi.order_id)               AS orders_count
            FROM order_items oi
            INNER JOIN orders o   ON oi.order_id   = o.id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE ${dateFilter}
            GROUP BY p.category
            ORDER BY items_sold DESC
        `);

        // ── Query 4: Peak hours (orders grouped into 2-hour buckets of the day) ──
        let peakHours = null;
        if (showPeakHours) {
            const [peakRows] = await pool.execute(`
                SELECT
                    FLOOR(HOUR(o.created_at) / 2) AS hour_bucket,
                    COUNT(*)                      AS order_count
                FROM orders o
                WHERE ${dateFilter}
                GROUP BY hour_bucket
                ORDER BY hour_bucket
            `);

            // Fill every bucket of the day so the chart stays consistent
            const counts = new Array(12).fill(0);
            for (const row of peakRows) {
                const bucket = Number(row.hour_bucket);
                if (bucket >= 0 && bucket <= 11) {
                    counts[bucket] = Number(row.order_count);
                }
            }

            peakHours = counts.map((count, bucket) => ({
                hour_bucket: bucket,
                label: bucketLabel(bucket),
                order_count: count,
            }));
        }

        return res.status(200).json({
            period: activePeriod,
            total_orders:      Number(stats.total_orders),
            order_placed:      Number(stats.order_placed),
            confirmed:         Number(stats.confirmed),
            preparing:         Number(stats.preparing),
            ready_for_pickup:  Number(stats.ready_for_pickup),
            out_for_delivery:  Number(stats.out_for_delivery),
            delivered:         Number(stats.delivered),
            total_revenue:   Number(Number(stats.total_revenue).toFixed(2)),
            avg_order_value: Number(Number(stats.avg_order_value).toFixed(2)),
            top_products:    topProducts.map((p) => ({
                name:          p.name,
                quantity_sold: Number(p.quantity_sold),
            })),
            category_performance: categoryRows.map((c) => ({
                category:     c.category,
                items_sold:   Number(c.items_sold),
                revenue:      Number(Number(c.revenue).toFixed(2)),
                orders_count: Number(c.orders_count),
            })),
            peak_hours: peakHours,
            peak_hours_available: showPeakHours,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

module.exports = { getDashboardStats };
