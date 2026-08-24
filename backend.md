# Cafe App — Backend Documentation

Complete reference for the Cafe App backend: server setup, environment, authentication, database tables, every REST API (inputs, outputs, errors, access rules), billing logic, and payment flows.

---

## 1. Overview

| Item | Value |
|---|---|
| Runtime | Node.js + Express 5 |
| Language | JavaScript (CommonJS) |
| Database | MySQL (via `mysql2/promise` connection pool) |
| Auth | JWT (Bearer token) + bcrypt password hashing |
| Payment gateway | Razorpay (UPI / cards / netbanking) |
| Default port | `5000` |
| CORS | Allowed origin: `http://localhost:3000` only (hardcoded in `server.js`) |
| Body parser | `express.json()` (JSON request bodies) |

### Run commands (from `server/`)

```bash
npm run dev     # nodemon server.js (development)
npm start       # node server.js (production)
```

### Project structure

```
server/
├── server.js                  # App entry: CORS, JSON parsing, route mounting, listen
├── package.json
├── .env                       # Secrets (never commit)
├── .env.example               # Template for env vars
├── config/
│   ├── db.js                  # MySQL connection pool
│   ├── razorpay.js            # Razorpay SDK instance
│   └── schema.sql             # DB schema (see "Schema gaps" in section 5)
├── middleware/
│   ├── authMiddleware.js      # Verifies JWT, sets req.user = { id, role }
│   └── roleMiddleware.js      # authorizeRoles("ADMIN", ...) role gate
├── routes/
│   ├── authRoutes.js          # /api/auth
│   ├── productRoutes.js       # /api/products
│   ├── orderRoutes.js         # /api/orders
│   ├── paymentRoutes.js       # /api/payments
│   ├── billRoutes.js          # /api/bill and /api/bill-settings
│   ├── staffRoutes.js         # /api/staff
│   ├── dashboardRoutes.js     # /api/dashboard
│   └── testRoutes.js          # /api/test
└── controllers/
    ├── authController.js
    ├── productController.js
    ├── orderController.js
    ├── paymentController.js
    ├── billController.js      # + bill calculation engine
    ├── staffController.js
    └── dashboardController.js
```

### Route mounting (`server.js`)

| Mount path | Router file |
|---|---|
| `/api/auth` | `authRoutes.js` |
| `/api/test` | `testRoutes.js` |
| `/api/orders` | `orderRoutes.js` |
| `/api/payments` | `paymentRoutes.js` |
| `/api/products` | `productRoutes.js` |
| `/api/bill` **and** `/api/bill-settings` | `billRoutes.js` (same router mounted twice) |
| `/api/staff` | `staffRoutes.js` |
| `/api/dashboard` | `dashboardRoutes.js` |
| `/` | inline health check |
| `/api/db-test` | inline DB connectivity check |

---

## 2. Environment Variables (`.env`)

Loaded via `dotenv`. Template in `server/.env.example`.

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | `server.js` | Server port (default `5000`) |
| `DB_HOST` | `config/db.js` | MySQL host |
| `DB_USER` | `config/db.js` | MySQL user |
| `DB_PASSWORD` | `config/db.js` | MySQL password |
| `DB_NAME` | `config/db.js` | Database name (`cafe_app`) |
| `DB_PORT` | `config/db.js` | MySQL port (`3306`) |
| `JWT_SECRET` | auth + middleware | Secret used to sign/verify JWTs |
| `JWT_EXPIRES_IN` | `authController.js` | Token lifetime (default `1d`) |
| `RAZORPAY_KEY_ID` | `config/razorpay.js`, `paymentController.js` | Razorpay public key (sent to checkout) |
| `RAZORPAY_KEY_SECRET` | `config/razorpay.js`, `paymentController.js` | Razorpay secret (signature verification) |

> Note: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are **not** listed in `.env.example` yet but are required for online payments.

---

## 3. Authentication & Authorization

### How protected endpoints accept auth

All protected routes expect an HTTP header:

```
Authorization: Bearer <jwt_token>
```

The token is issued by `POST /api/auth/login` and stored client-side (localStorage key `token`).

### `authMiddleware.js` (authenticateToken)

1. Reads `req.headers.authorization`; missing header → `401 "Access token is required"`.
2. Must be exactly `Bearer <token>` → otherwise `401 "Invalid authorization format"`.
3. Verifies the JWT with `JWT_SECRET` → invalid/expired → `401 "Invalid or expired token"`.
4. On success sets `req.user = { id, role }` (the JWT payload) and calls `next()`.

### `roleMiddleware.js` (authorizeRoles)

Factory: `authorizeRoles(...allowedRoles)`.

- No `req.user` → `401 "Authentication required"`.
- `req.user.role` not in allowed roles → `403 "Access denied"`.

### Roles

| Role | Meaning |
|---|---|
| `USER` | Customer (registers via `/api/auth/register`; role forced to `USER`) |
| `STAFF` | Kitchen / counter staff (created by ADMIN via `/api/staff`) |
| `ADMIN` | Full control (products, staff, bill settings, dashboard) |

---

## 4. API Reference

Conventions:

- All request/response bodies are **JSON**.
- `Auth` column: `Public` = no header needed; `USER/STAFF/ADMIN` = requires `Authorization: Bearer <token>` (role gate where shown).
- Error responses always contain a `message` field.

### 4.1 Health / Test endpoints

#### `GET /` — API health check
- Auth: Public
- Response `200`: `{ "message": "Cafe App API is running" }`

#### `GET /api/db-test` — DB connectivity check
- Auth: Public
- Response `200`: `{ "message": "MySQL connection successful", "data": [{ "result": 1 }] }`
- Response `500`: `{ "message": "Database connection failed" }`

#### `/api/test` (`testRoutes.js`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/test/user` | Any logged-in user | Returns `{ message, user: req.user }` |
| GET | `/api/test/staff` | STAFF only | Returns `{ message: "Welcome Staff", user }` |
| GET | `/api/test/admin` | ADMIN only | Returns `{ message: "Welcome Admin", user }` |

---

### 4.2 Auth APIs (`/api/auth`)

#### `POST /api/auth/register` — create customer account
- Auth: Public
- Body:

```json
{
  "name": "Aarav",
  "email": "aarav@example.com",
  "password": "secret123"
}
```

| Field | Rules |
|---|---|
| `name` | required |
| `email` | required, must be unique |
| `password` | required, min 6 characters |

- Validation errors: `400` (missing fields / short password), `409 "Email already registered"`.
- Response `201`:

```json
{
  "message": "User registered successfully",
  "user": { "id": 5, "name": "Aarav", "email": "aarav@example.com", "role": "USER" }
}
```

- Password is hashed with bcrypt (10 salt rounds) before insert. Role is always `USER`.

#### `POST /api/auth/login` — get JWT
- Auth: Public
- Body:

```json
{ "email": "aarav@example.com", "password": "secret123" }
```

- Errors: `400` (missing fields), `401 "Invalid email or password"` (unknown email or wrong password).
- Response `200`:

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "user": { "id": 5, "name": "Aarav", "email": "aarav@example.com", "role": "USER" }
}
```

- JWT payload: `{ id, role }`, signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default `1d`).

---

### 4.3 Products APIs (`/api/products`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List all products |
| GET | `/api/products/:id` | Public | Single product |
| POST | `/api/products` | ADMIN | Create product |
| PUT | `/api/products/:id` | ADMIN | Update product |
| DELETE | `/api/products/:id` | ADMIN | Delete product (+ its order_items rows) |

#### `GET /api/products`
- Response `200`: `{ "products": [ { id, name, image, price, description, category, created_at }, ... ] }` (ordered by category, then name).

#### `GET /api/products/:id`
- Param: `id` (product id in URL path).
- Response `200`: `{ "product": { ... } }` — `404 "Product not found"` if missing.

#### `POST /api/products`
- Body:

```json
{
  "name": "Special Masala Chai",
  "price": 35,
  "category": "Chai",
  "description": "optional text (max 500 chars)",
  "image": "optional URL/string"
}
```

| Field | Rules |
|---|---|
| `name` | required |
| `price` | required, number ≥ 0 |
| `category` | required, one of `"Chai"`, `"Coffee"`, `"Snacks"` |
| `description` | optional, ≤ 500 chars |
| `image` | optional |

- Errors: `400` (missing fields / negative price / invalid category / long description).
- Response `201`: `{ "message": "Product created successfully", "product": { ... } }`

#### `PUT /api/products/:id`
- Param: `id`; Body: same validation rules as POST (full replace of name/price/category/description/image).
- Response `200`: `{ "message": "Product updated successfully", "product": { ... } }` — `404` if not found.

#### `DELETE /api/products/:id`
- Param: `id`. Runs in a transaction: deletes dependent `order_items` rows first, then the product.
- Response `200`: `{ "message": "Product deleted successfully", "product": { "id": 3, "name": "Ginger Chai" } }` — `404` if not found.

---

### 4.4 Orders APIs (`/api/orders`)

#### `POST /api/orders` — place an order
- Auth: any logged-in user. Header: `Authorization: Bearer <token>`.
- Body:

```json
{
  "items": [
    { "product_id": 4, "quantity": 2 },
    { "product_id": 7, "quantity": 1 }
  ],
  "payment_mode": "CASH"
}
```

| Field | Rules |
|---|---|
| `items` | required, non-empty array |
| `items[].product_id` | required, must exist in `products` |
| `items[].quantity` | required, integer > 0 |
| `payment_mode` | optional; `"CASH"` (default) or `"ONLINE"` |

- Server behavior:
  1. Validates every product exists (prices are **always read from the DB**, never trusted from the client).
  2. Fetches active `bill_settings` and computes the full bill breakdown (section 6).
  3. Inserts the order + all order_items in a **single DB transaction** (rollback on any failure).
  4. New order starts with `status = 'PENDING'`, `payment_status = 'PENDING'`.
- Response `201`:

```json
{
  "message": "Order created successfully",
  "order": {
    "id": 64,
    "user_id": 5,
    "total_amount": 167,
    "breakdown": {
      "subtotal": 145,
      "packaging_fee_percent": 5,
      "packaging_fee": 7.25,
      "platform_fee": 5,
      "food_and_packaging_base": 152.25,
      "cgst_percent": 2.5,
      "cgst": 3.81,
      "sgst_percent": 2.5,
      "sgst": 3.81,
      "platform_fee_gst_percent": 18,
      "platform_fee_gst": 0.9,
      "calculated_total": 165.77,
      "rounding_off": 0.23,
      "grand_total": 166
    },
    "status": "PENDING",
    "payment_mode": "CASH",
    "payment_status": "PENDING"
  }
}
```

- Errors: `400 "Order must contain at least one item"` / `"Invalid product or quantity"`, `404 "Product with id X not found"`, `500 "Internal server error"`.

#### `GET /api/orders/my-orders` — customer's own order history
- Auth: any logged-in user. Orders filtered by `req.user.id`, newest first.
- Each order includes its `items` array (joined with product names).
- Response `200`: `{ "message": "Orders retrieved successfully", "orders": [ { id, user_id, total_amount, status, payment_mode, payment_status, created_at, items: [ { id, product_id, name, quantity, price } ] } ] }`

#### `GET /api/orders` — all orders (staff dashboard)
- Auth: STAFF or ADMIN.
- Returns orders from the **last 24 hours** (`created_at >= NOW() - INTERVAL 24 HOUR`), newest first, with customer info (`user_name`, `user_email`) and each order's `items` (with `product_name`).
- Response `200`: `{ "message": "Orders retrieved successfully", "orders": [...] }`

#### `PATCH /api/orders/:id/status` — advance order status
- Auth: STAFF or ADMIN.
- Params: `id` (order id). Body: `{ "status": "PREPARING" }` or `{ "status": "COMPLETED" }`.
- Allowed transitions (enforced server-side):

```
PENDING → PREPARING → COMPLETED   (COMPLETED is final)
```

- Errors: `400 "Status is required"` / `"Invalid status"` / `"Pending order can only be moved to PREPARING"` / `"Preparing order can only be moved to COMPLETED"` / `"Completed order cannot be changed"`, `404 "Order not found"`.
- Response `200`: `{ "message": "Order status updated successfully", "order": { "id": 64, "status": "PREPARING" } }`

#### `PATCH /api/orders/:id/payment-status` — confirm cash received
- Auth: STAFF or ADMIN.
- Params: `id`. Body: `{ "payment_status": "PAID" }` (only `PAID` accepted).
- Rules:
  - Only for `payment_mode = 'CASH'` orders → online orders return `400 "Online payments are managed automatically by Razorpay"`.
  - Only if current `payment_status = 'PENDING'` → otherwise `400 "This payment is already settled"`.
- Effects: sets `orders.payment_status = 'PAID'` and inserts a `payments` row (`method = 'CASH'`, `status = 'SUCCESS'`; insert is best-effort).
- Response `200`: `{ "message": "Cash payment marked as received", "order": { "id": 64, "payment_mode": "CASH", "payment_status": "PAID" } }`

---

### 4.5 Payments APIs (`/api/payments`) — Razorpay online flow

All require auth (`Authorization: Bearer <token>`). Amounts are always taken from the `orders` row in the DB — the client never sends an amount.

#### `POST /api/payments/create` — start online payment
- Body: `{ "order_id": 64 }`
- Checks: order exists (`404`), belongs to `req.user.id` (`403 "This order does not belong to you"`), valid amount.
- Creates a Razorpay order (`amount` in **paise**, receipt `order_rcpt_<order.id>`, notes with app order id + user id) and records a `payments` row (`method='RAZORPAY'`, `status='PENDING'`).
- Response `201`:

```json
{
  "message": "Razorpay order created",
  "razorpay_order_id": "order_Nxxx...",
  "amount": 16700,
  "currency": "INR",
  "key_id": "<RAZORPAY_KEY_ID>",
  "app_order_id": 64
}
```

- Errors: `400 "order_id is required"` / `"Invalid order amount"`, `404`, `403`, `500 "Failed to initiate payment"`.

#### `POST /api/payments/verify` — verify after checkout success
- Body:

```json
{
  "order_id": 64,
  "razorpay_order_id": "order_Nxxx...",
  "razorpay_payment_id": "pay_Nxxx...",
  "razorpay_signature": "abcdef..."
}
```

- Checks: all fields required (`400`), order exists (`404`), order belongs to user (`403`).
- Verifies HMAC-SHA256 signature: `HMAC(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` compared to `razorpay_signature`.
  - Mismatch → marks payment + order as `FAILED`, returns `400 "Payment verification failed"`.
  - Match → `payments` row updated to `status='SUCCESS'` with payment id + signature (inserted if the earlier PENDING insert failed), and `orders.payment_status = 'PAID'`.
- Response `200`: `{ "message": "Payment verified successfully", "payment_id": "pay_Nxxx...", "order_id": 64, "status": "PAID" }`

#### `POST /api/payments/failed` — record a failed checkout
- Called by the frontend when Razorpay fires `payment.failed` (wrong UPI PIN, insufficient funds, etc.).
- Body: `{ "order_id": 64, "razorpay_order_id": "order_Nxxx...", "reason": "description from Razorpay" }` (only `order_id` strictly required).
- Checks: order exists (`404`), belongs to user (`403`).
- Effects: sets `orders.payment_status = 'FAILED'` and `payments.status = 'FAILED'` (best effort); logs the reason.
- Response `200`: `{ "message": "Payment marked as failed", "order_id": 64, "payment_status": "FAILED" }`

### End-to-end online payment sequence (as used by the cart page)

```
1. POST /api/orders            { items, payment_mode: "ONLINE" }  → app order (PENDING/PENDING)
2. POST /api/payments/create   { order_id }                       → razorpay_order_id + key_id
3. Razorpay Checkout opens in browser (client-side)
   ├── success → handler fires
   │     4. POST /api/payments/verify  → signature check → order PAID → cart cleared → success page
   └── failure / dismiss
         ├── POST /api/payments/failed (on payment.failed event)
         └── order stays PENDING/FAILED in DB (see note in section 8)
```

---

### 4.6 Bill Settings APIs (`/api/bill` and `/api/bill-settings`)

Both mount paths expose the same endpoints.

| Method | Path(s) | Auth | Description |
|---|---|---|---|
| GET | `/api/bill/settings`, `/api/bill/`, `/api/bill-settings`, `/api/bill-settings/settings` | Public | Get current billing config |
| PUT | `/api/bill/settings`, `/api/bill/`, `/api/bill-settings`, `/api/bill-settings/settings` | ADMIN | Update billing config |

#### `GET .../settings`
- Auto-creates the `bill_settings` table + default row (id = 1) on first call.
- Response `200`: `{ "message": "Bill settings retrieved successfully", "settings": { "packaging_fee_percent": 5, "platform_fee": 5, "cgst_percent": 2.5, "sgst_percent": 2.5, "platform_fee_gst_percent": 18, "updated_at": "..." } }`
- On DB error it still returns `200` with built-in defaults.

#### `PUT .../settings`
- Body (all fields required, all must be numbers ≥ 0):

```json
{
  "packaging_fee_percent": 5,
  "platform_fee": 5,
  "cgst_percent": 2.5,
  "sgst_percent": 2.5,
  "platform_fee_gst_percent": 18
}
```

- Errors: `400` (missing or invalid values), `500`.
- Response `200`: `{ "message": "Bill settings updated successfully", "settings": { ... } }`

---

### 4.7 Staff APIs (`/api/staff`) — ADMIN only

The whole router is gated by `router.use(authenticateToken, authorizeRoles("ADMIN"))`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/staff` | List all STAFF users (newest first) |
| GET | `/api/staff/search?q=<term>` | Search staff by name, or by ID when `q` is numeric |
| GET | `/api/staff/:id` | Single staff member |
| POST | `/api/staff` | Create staff account |
| DELETE | `/api/staff/:id` | Delete staff member |

Staff rows return `{ id, name, email, role, created_at }` (never the password hash).

#### `GET /api/staff/search?q=...`
- Query param `q` required (`400 "Search query is required"`).
- Numeric `q` matches `id = ?` **or** `name LIKE %q%`; non-numeric matches name only.

#### `POST /api/staff`
- Body: `{ "name": "...", "email": "...", "password": "min6chars" }`
- Errors: `400` (missing fields / short password), `409 "Email already registered"`.
- Response `201`: `{ "message": "Staff member created successfully", "staff": { id, name, email, role: "STAFF" } }`

#### `DELETE /api/staff/:id`
- Safety guard: only deletes rows where `role = 'STAFF'` (admins/customers can't be deleted this way).
- Response `200`: `{ "message": "Staff member deleted successfully" }` — `404 "Staff member not found"`.

---

### 4.8 Dashboard API (`/api/dashboard`) — ADMIN only

#### `GET /api/dashboard/stats?period=1h|3h|24h|3d|7d`
- Query param `period` (optional, default `24h`). Invalid values fall back to `24h`.
- Returns aggregated stats for the window: totals, status counts, revenue, top products, category performance, and peak hours.

Response `200`:

```json
{
  "period": "24h",
  "total_orders": 12,
  "pending": 2,
  "preparing": 3,
  "completed": 7,
  "total_revenue": 1840,
  "avg_order_value": 153.33,
  "top_products": [ { "name": "Special Masala Chai", "quantity_sold": 9 } ],
  "category_performance": [
    { "category": "Chai", "items_sold": 14, "revenue": 490, "orders_count": 10 }
  ],
  "peak_hours": [
    { "hour_bucket": 8, "label": "4 PM – 6 PM", "order_count": 5 }
  ],
  "peak_hours_available": true
}
```

- `peak_hours` is a full 12-bucket (2-hour) array; it is `null` and `peak_hours_available: false` for `1h`/`3h` windows.

---

## 5. Database Schema

Database: `cafe_app` (utf8mb4). Base schema in `server/config/schema.sql`. All queries use parameterized `pool.execute(...)`.

### Tables

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | PK |
| `name` | VARCHAR(100) NOT NULL | |
| `email` | VARCHAR(191) NOT NULL | UNIQUE |
| `password` | VARCHAR(255) NOT NULL | bcrypt hash (10 rounds) |
| `role` | ENUM('USER','STAFF','ADMIN') | default 'USER' |
| `created_at` | TIMESTAMP | default CURRENT_TIMESTAMP |

#### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | PK |
| `name` | VARCHAR(150) NOT NULL | |
| `image` | TEXT NULL | |
| `price` | DECIMAL(10,2) NOT NULL | |
| `category` | ENUM('Chai','Coffee','Snacks') NOT NULL | |
| `created_at` | TIMESTAMP | default CURRENT_TIMESTAMP |

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | PK |
| `user_id` | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| `total_amount` | DECIMAL(10,2) NOT NULL | final grand total (after fees/taxes/rounding) |
| `status` | ENUM('PENDING','PREPARING','COMPLETED') | default 'PENDING' |
| `payment_mode` | — | `'CASH'` or `'ONLINE'` (written by code) |
| `payment_status` | — | `'PENDING'`, `'PAID'`, `'FAILED'` (written by code) |
| `created_at` | TIMESTAMP | default CURRENT_TIMESTAMP |

Indexes: `user_id`, `status`, `created_at`.

#### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | PK |
| `order_id` | INT NOT NULL | FK → orders(id) ON DELETE CASCADE |
| `product_id` | INT NOT NULL | FK → products(id) ON DELETE CASCADE |
| `quantity` | INT NOT NULL | |
| `price` | DECIMAL(10,2) NOT NULL | **price snapshot** at order time (not live) |

Indexes: `order_id`, `product_id`.

#### `payments`

| Column | Type | Notes |
|---|---|---|
| `order_id` | — | app order id |
| `method` | — | `'RAZORPAY'` or `'CASH'` |
| `razorpay_order_id` | — | Razorpay order id (lookup key for updates) |
| `razorpay_payment_id` | — NULL | set on verify success |
| `razorpay_signature` | — NULL | set on verify success |
| `amount` | — | order total in rupees |
| `status` | — | `'PENDING'` → `'SUCCESS'` / `'FAILED'` |

#### `bill_settings` — single row (id = 1)

| Column | Type | Default |
|---|---|---|
| `packaging_fee_percent` | DECIMAL(5,2) | 5.00 |
| `platform_fee` | DECIMAL(10,2) | 5.00 (flat ₹) |
| `cgst_percent` | DECIMAL(5,2) | 2.50 |
| `sgst_percent` | DECIMAL(5,2) | 2.50 |
| `platform_fee_gst_percent` | DECIMAL(5,2) | 18.00 |
| `updated_at` | TIMESTAMP | auto-updates |

### Relationships

```
users 1 ──── * orders 1 ──── * order_items * ──── 1 products
                  │
                  └──── * payments
bill_settings (single row, id = 1)
```

### ⚠ Schema gaps (`schema.sql` is behind the code)

`server/config/schema.sql` (dated 2026-08-21) does **not** yet include:

1. `orders.payment_mode` and `orders.payment_status` columns (used by order/payment controllers and every dashboard screen).
2. The `payments` table (used by `paymentController.js` and cash confirmation).

If you rebuild the DB from `schema.sql` alone, order creation and payments will fail. Add:

```sql
ALTER TABLE orders
    ADD COLUMN payment_mode ENUM('CASH','ONLINE') NOT NULL DEFAULT 'CASH',
    ADD COLUMN payment_status ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    method VARCHAR(20) NOT NULL,
    razorpay_order_id VARCHAR(100) NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    razorpay_signature VARCHAR(255) NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

---

## 6. Bill Calculation Logic (`billController.js`)

`calculateBillBreakdown(subtotal, settings)` — used by order creation (server) and the cart UI (client, via `lib/billCalculator`).

Given `subtotal` = Σ (product price × quantity):

```
packaging_fee   = subtotal × packaging_fee_percent%        (0 if subtotal = 0)
platform_fee    = flat platform_fee                        (0 if subtotal = 0)
cgst            = (subtotal + packaging_fee) × cgst_percent%
sgst            = (subtotal + packaging_fee) × sgst_percent%
platform_fee_gst= platform_fee × platform_fee_gst_percent%
calculated_total= subtotal + packaging_fee + platform_fee + cgst + sgst + platform_fee_gst
grand_total     = CEIL(calculated_total)                   (rounding_off = grand_total − calculated_total)
```

Every line is rounded to 2 decimals; the final grand total is rounded **up** to the next whole rupee. The `grand_total` is what gets stored in `orders.total_amount` and charged via Razorpay (converted to paise server-side).

Example (subtotal ₹145, default settings): packaging 7.25, platform 5.00, CGST 3.81, SGST 3.81, platform GST 0.90 → calculated 165.77 → **grand total ₹166** (rounding 0.23).

---

## 7. Order Lifecycle

```
                 POST /api/orders (CASH or ONLINE)
                            │
                            ▼
        status=PENDING  payment_status=PENDING
             │                        │
   STAFF: PATCH /:id/status       CASH:  STAFF PATCH /:id/payment-status → PAID
   PENDING → PREPARING            ONLINE: POST /api/payments/verify
             │                            ├─ signature OK    → PAID
   STAFF: PREPARING → COMPLETED         └─ signature BAD   → FAILED
             │                        ONLINE failure/dismiss:
             ▼                          POST /api/payments/failed → FAILED
         COMPLETED (final)
```

- Order `status` (kitchen flow) and `payment_status` (money flow) are independent.
- `updateOrderStatus` enforces strict transitions; `updatePaymentStatus` is cash-only.

---

## 8. Known Behavior / Gotchas

1. **Failed online payments leave the order row behind.** The cart page creates the app order (`POST /api/orders` with `payment_mode: "ONLINE"`) *before* opening Razorpay Checkout. If the user dismisses Checkout or the payment fails, the order stays in the DB as `PENDING`/`FAILED` and shows up on the staff dashboard (e.g., "UPI / Online PENDING"). The cart items themselves are kept client-side (cart is only cleared after verified success), but the ghost order rows remain. See the pending fix: delete the unpaid order (or create the order only after payment verification).
2. **Amounts are never trusted from the client** — order totals come from DB product prices + bill settings; Razorpay amounts come from `orders.total_amount` converted to paise.
3. **CORS is hardcoded** to `http://localhost:3000` in `server.js`; change it for any other frontend origin.
4. **`GET /api/orders` (staff) returns only the last 24 hours.**
5. **`bill_settings` self-heals**: table + default row are auto-created on first bill-settings request; on any error the API returns defaults with HTTP 200.
6. **Product deletion cascades order_items** manually in a transaction (works even if the FK lacks ON DELETE CASCADE) — historical order totals keep their snapshot prices, but item names come from a LEFT JOIN and show `'Item'` if the product row is gone.
