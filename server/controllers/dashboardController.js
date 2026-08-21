const pool = require("../config/db");

/**
 * GET /api/dashboard/stats?period=1h|3h|24h|yesterday|3d
 *
 * Returns aggregated order stats for the requested time window.
 */
const getDashboardStats = async (req, res) => {
    try {
        const { period } = req.query;

        // Build the WHERE clause based on the requested period
        let dateFilter;

        switch (period) {
            case "1h":
                dateFilter = "o.created_at >= NOW() - INTERVAL 1 HOUR";
                break;
            case "3h":
                dateFilter = "o.created_at >= NOW() - INTERVAL 3 HOUR";
                break;
            case "24h":
                dateFilter = "o.created_at >= NOW() - INTERVAL 24 HOUR";
                break;
            case "yesterday":
                dateFilter = "DATE(o.created_at) = CURDATE() - INTERVAL 1 DAY";
                break;
            case "3d":
                dateFilter = "o.created_at >= NOW() - INTERVAL 3 DAY";
                break;
            default:
                // Default to last 24 hours
                dateFilter = "o.created_at >= NOW() - INTERVAL 24 HOUR";
        }

        // ── Query 1: Order counts + revenue ──
        const [statsRows] = await pool.execute(`
            SELECT
                COUNT(*)                                             AS total_orders,
                COALESCE(SUM(CASE WHEN o.status = 'PENDING'    THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN o.status = 'PREPARING'  THEN 1 ELSE 0 END), 0) AS preparing,
                COALESCE(SUM(CASE WHEN o.status = 'COMPLETED'  THEN 1 ELSE 0 END), 0) AS completed,
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

        return res.status(200).json({
            period: period || "24h",
            total_orders:    Number(stats.total_orders),
            pending:         Number(stats.pending),
            preparing:       Number(stats.preparing),
            completed:       Number(stats.completed),
            total_revenue:   Number(Number(stats.total_revenue).toFixed(2)),
            avg_order_value: Number(Number(stats.avg_order_value).toFixed(2)),
            top_products:    topProducts.map((p) => ({
                name:          p.name,
                quantity_sold: Number(p.quantity_sold),
            })),
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};

module.exports = { getDashboardStats };
