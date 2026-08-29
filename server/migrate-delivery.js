/* eslint-disable no-console */
// One-time migration for the delivery feature. Safe to re-run.
require("dotenv").config();
const pool = require("./config/db");

const statements = [
    `ALTER TABLE users
        MODIFY role ENUM('USER','STAFF','ADMIN','DELIVERY') NOT NULL DEFAULT 'USER'`,
    `ALTER TABLE orders
        MODIFY status ENUM('PENDING','PREPARING','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','COMPLETED')
        NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE orders
        ADD COLUMN delivery_address VARCHAR(500) NULL,
        ADD COLUMN latitude DECIMAL(10,8) NULL,
        ADD COLUMN longitude DECIMAL(11,8) NULL,
        ADD COLUMN delivery_boy_id INT NULL`,
    `ALTER TABLE orders
        ADD CONSTRAINT fk_orders_delivery_boy
        FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE SET NULL`,
    `CREATE INDEX idx_orders_delivery_boy ON orders(delivery_boy_id)`
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
