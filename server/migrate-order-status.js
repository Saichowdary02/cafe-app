/* eslint-disable no-console */
// One-time migration for the 6-step order status flow. Safe to re-run.
// Maps legacy values: PENDING → ORDER_PLACED, READY_FOR_DELIVERY → READY_FOR_PICKUP,
// COMPLETED → DELIVERED. Existing PREPARING / OUT_FOR_DELIVERY rows are kept as-is.
require("dotenv").config();
const pool = require("./config/db");

const FINAL_ENUM =
    "ENUM('ORDER_PLACED','CONFIRMED','PREPARING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED') " +
    "NOT NULL DEFAULT 'ORDER_PLACED'";

// Both old + new values so legacy rows stay valid until they are remapped
const WIDE_ENUM =
    "ENUM('ORDER_PLACED','CONFIRMED','PREPARING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED'," +
    "'PENDING','READY_FOR_DELIVERY','COMPLETED') " +
    "NOT NULL DEFAULT 'ORDER_PLACED'";

const statements = [
    // 1. Widen the enum so old values still exist
    `ALTER TABLE orders MODIFY status ${WIDE_ENUM}`,
    // 2. Remap legacy values
    `UPDATE orders SET status = 'ORDER_PLACED' WHERE status = 'PENDING'`,
    `UPDATE orders SET status = 'READY_FOR_PICKUP' WHERE status = 'READY_FOR_DELIVERY'`,
    `UPDATE orders SET status = 'DELIVERED' WHERE status = 'COMPLETED'`,
    // 3. Shrink the enum to the final 6 values
    `ALTER TABLE orders MODIFY status ${FINAL_ENUM}`
];

(async () => {
    for (const sql of statements) {
        try {
            await pool.query(sql);
            console.log("OK:", sql.split("\n")[0].trim());
        } catch (err) {
            if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_DUP_CONSTRAINT" || err.code === "ER_DUP_KEYNAME" || err.errno === 1061) {
                console.log("SKIP (already applied):", sql.split("\n")[0].trim());
            } else {
                console.error("FAILED:", err.code, err.message);
            }
        }
    }
    await pool.end();
    console.log("Migration finished.");
    process.exit(0);
})();