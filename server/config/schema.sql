-- Cafe App Database Initialization Script
-- Run this script in MySQL Workbench or MySQL CLI

CREATE DATABASE IF NOT EXISTS cafe_app;
USE cafe_app;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('USER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    image TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category ENUM('Chai', 'Coffee', 'Snacks') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'PREPARING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Sample Initial Menu Items (Optional Seed Data)
INSERT INTO products (name, price, category, image) VALUES
('Masala Chai', 30.00, 'Chai', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3'),
('Ginger Chai', 35.00, 'Chai', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574'),
('Elaichi Chai', 35.00, 'Chai', 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8'),
('Espresso', 90.00, 'Coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd'),
('Cappuccino', 120.00, 'Coffee', 'https://images.unsplash.com/photo-1534778101976-62847782c213'),
('Cold Coffee', 110.00, 'Coffee', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5'),
('Veg Puff', 40.00, 'Snacks', 'https://images.unsplash.com/photo-1601050690597-df0568f70950'),
('Paneer Puff', 50.00, 'Snacks', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'),
('Chocolate Cookie', 50.00, 'Snacks', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e');
