-- ============================================================
-- Cafe App Database Schema
-- Last updated: 2026-08-28
-- Tables: users, products, orders, order_items, payments, bill_settings
-- ============================================================

CREATE DATABASE IF NOT EXISTS cafe_app
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cafe_app;

-- ============================================================
-- 1. Users Table
--    Roles: USER (customer), STAFF (kitchen/counter), ADMIN, DELIVERY
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(191)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,
    role        ENUM('USER', 'STAFF', 'ADMIN', 'DELIVERY') NOT NULL DEFAULT 'USER',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Products Table
--    Categories: Chai, Coffee, Snacks
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    image       TEXT          NULL,
    price       DECIMAL(10,2) NOT NULL,
    description VARCHAR(500)  NULL,
    category    ENUM('Chai', 'Coffee', 'Snacks') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Orders Table
--    Status flow: PENDING → PREPARING → COMPLETED
--    Delivery fields: delivery_address / latitude / longitude (customer
--    selected at checkout), delivery_boy_id (assigned by ADMIN).
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT           NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status       ENUM('PENDING', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    payment_mode   ENUM('CASH', 'ONLINE') NOT NULL DEFAULT 'CASH',
    payment_status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    delivery_address VARCHAR(500) NULL,
    latitude         DECIMAL(10,8) NULL,
    longitude        DECIMAL(11,8) NULL,
    delivery_boy_id  INT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_delivery_boy
        FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id  ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders(created_at);

-- ============================================================
-- 4. Order Items Table
--    Stores individual line items per order.
--    price is snapshotted at time of order (not live from products).
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT           NOT NULL,
    product_id  INT           NOT NULL,
    quantity    INT           NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    CONSTRAINT fk_items_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- 5. Payments Table
--    Razorpay online payments + manual CASH confirmations.
--    razorpay_order_id is the lookup key for updates; razorpay_*,
--    signature fields are set on verify success.
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_id            INT           NOT NULL,
    method              VARCHAR(20)   NOT NULL,
    razorpay_order_id   VARCHAR(100)  NULL,
    razorpay_payment_id VARCHAR(100)  NULL,
    razorpay_signature  VARCHAR(255)  NULL,
    amount              DECIMAL(10,2) NOT NULL,
    status              ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_rzp_order_id ON payments(razorpay_order_id);

-- ============================================================
-- 6. Bill Settings Table
--    Single-row config (id = 1) for billing rates.
--    Auto-created by billController on first request if missing,
--    but defined here for fresh installs / migrations.
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_settings (
    id                      INT PRIMARY KEY AUTO_INCREMENT,
    packaging_fee_percent   DECIMAL(5,2)  NOT NULL DEFAULT 5.00,
    platform_fee            DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    cgst_percent            DECIMAL(5,2)  NOT NULL DEFAULT 2.50,
    sgst_percent            DECIMAL(5,2)  NOT NULL DEFAULT 2.50,
    platform_fee_gst_percent DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default billing config row (id = 1)
INSERT IGNORE INTO bill_settings
    (id, packaging_fee_percent, platform_fee, cgst_percent, sgst_percent, platform_fee_gst_percent)
VALUES
    (1, 5.00, 5.00, 2.50, 2.50, 18.00);

-- ============================================================
-- ============================================================
-- 7. Delivery Feature Migration
--    Run this on existing databases (MySQL 8 supports IF NOT EXISTS
--    on ADD COLUMN / MODIFY only from 8.0.29+; for safety we provide
--    plain statements — re-running may error if already applied).
-- ============================================================

-- 7.1 Allow the DELIVERY role on users
ALTER TABLE users
    MODIFY role ENUM('USER', 'STAFF', 'ADMIN', 'DELIVERY') NOT NULL DEFAULT 'USER';

-- 7.2 Delivery location + assignment on orders
ALTER TABLE orders
    ADD COLUMN delivery_address VARCHAR(500) NULL,
    ADD COLUMN latitude         DECIMAL(10,8) NULL,
    ADD COLUMN longitude        DECIMAL(11,8) NULL,
    ADD COLUMN delivery_boy_id  INT NULL;

ALTER TABLE orders
    MODIFY status ENUM('PENDING', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'COMPLETED')
        NOT NULL DEFAULT 'PENDING';

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_delivery_boy
        FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy ON orders(delivery_boy_id);
