/* eslint-disable no-console */
// One-time migration for the customer delivery-tracking feature. Safe to re-run.
require("dotenv").config();
const pool = require("./config/db");

const statements = [
    `CREATE TABLE IF NOT EXISTS delivery_locations (
        delivery_boy_id INT NOT NULL PRIMARY KEY,
        latitude        DECIMAL(10,8) NOT NULL,
        longitude       DECIMAL(11,8) NOT NULL,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_dlivery_loc_boy
            FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE CASCADE
    )`
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
