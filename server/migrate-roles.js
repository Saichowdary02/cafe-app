/* eslint-disable no-console */
// One-time migration: rename the STAFF role to KITCHEN. Safe to re-run.
require("dotenv").config();
const pool = require("./config/db");

const FINAL_ENUM =
    "ENUM('USER','KITCHEN','ADMIN','DELIVERY') NOT NULL DEFAULT 'USER'";
const WIDE_ENUM =
    "ENUM('USER','KITCHEN','ADMIN','DELIVERY','STAFF') NOT NULL DEFAULT 'USER'";

const statements = [
    `ALTER TABLE users MODIFY role ${WIDE_ENUM}`,
    `UPDATE users SET role = 'KITCHEN' WHERE role = 'STAFF'`,
    `ALTER TABLE users MODIFY role ${FINAL_ENUM}`
];

(async () => {
    for (const sql of statements) {
        try {
            await pool.query(sql);
            console.log("OK:", sql.slice(0, 60));
        } catch (err) {
            console.error("FAILED:", err.code, err.message);
        }
    }
    await pool.end();
    console.log("Migration finished.");
    process.exit(0);
})();