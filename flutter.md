# Cafe App — Flutter Mobile App Specification

Feature specification for the Flutter mobile version of the Cafe App. **The backend stays exactly as documented in `backend.md`** — the same Express + MySQL + Razorpay server, same REST APIs, same JWT auth, same roles. The Flutter app is a pure API consumer.

---

## 1. Goals

- Bring the full customer experience (browse → cart → pay → track) to Android/iOS with a native feel.
- Give STAFF and ADMIN the same management power as the web dashboard, optimized for phones.
- Reuse the existing backend with **zero server changes for the MVP** (one small optional endpoint noted in section 10 for failed-payment cleanup).
- Match the web brand: warm orange (`#ea580c`) primary, cream/stone surfaces, rounded cards.

## 2. Backend Contract (unchanged)

| Item | Value |
|---|---|
| Base URL | `http://<server>:5000` (build flavor / env config: dev `http://10.0.2.2:5000` for Android emulator, prod configurable) |
| Auth | `Authorization: Bearer <jwt>` header on every protected call |
| Token source | `POST /api/auth/login` (payload `{ id, role }`, expires `1d`) |
| Content type | All request/response bodies are JSON |
| Payments | Razorpay — mobile uses the **`razorpay_flutter`** SDK instead of the web checkout script; verify/failed endpoints are identical |
| CORS | Irrelevant for native apps (CORS only affects browsers) — no server change needed |

Full endpoint reference: see `backend.md` section 4.

---

## 3. Proposed Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Flutter (latest stable) | Single codebase, Android + iOS |
| State management | Riverpod | Simple DI + reactive state, testable |
| HTTP client | `dio` | Interceptors for auth header, token expiry (401 → auto logout), logging |
| Secure storage | `flutter_secure_storage` | JWT token + user info (replaces web localStorage `token`) |
| Local cart/cache | `shared_preferences` (MVP) → `drift`/`sqflite` (later) | Cart persistence replaces web localStorage `cart` |
| Payments | `razorpay_flutter` | Same key/order/verify flow as web |
| Push notifications | `firebase_messaging` (FCM) | Phase 2 — requires backend addition (section 10) |
| Images | `cached_network_image` | Product images from API `image` field with local fallbacks (chai/coffee/snack assets, same as web) |
| Money formatting | `intl` | `₹` + `en_IN` grouping |
| JSON models | `freezed` + `json_serializable` | Typed models matching backend responses |

### Suggested project layout

```
lib/
├── main.dart
├── core/            # api client (dio), storage, theme, constants, utils
├── features/
│   ├── auth/        # login, register, session controller
│   ├── menu/        # home, categories, product detail
│   ├── cart/        # cart state (local), bill breakdown
│   ├── checkout/    # payment method, razorpay flow, order success
│   ├── orders/      # my orders, order tracking
│   ├── staff/       # live order board, status actions, cash confirm
│   ├── admin/       # dashboard stats, products, staff, bill settings
│   └── profile/     # account, logout
└── shared/          # widgets (status badges, bill summary card, qty stepper)
```

---

## 4. Roles in the App

Same roles as backend (`users.role`): `USER`, `STAFF`, `ADMIN`. After login the app reads `role` from the login response and routes accordingly:

| Role | App experience |
|---|---|
| `USER` | Customer app: menu, cart, checkout, my orders, profile |
| `STAFF` | Staff mode: live order board, status updates, mark cash received |
| `ADMIN` | Everything in Staff mode **plus** Admin console (stats, products, staff, bill settings) |

---

## 5. Feature List — Customer (USER)

### F1. Splash & Session
- Splash screen while the stored token is validated.
- Auto-login: token found in secure storage → route by role (customer home / staff board).
- Token expired (any API returns `401`) → clear session, show login with a "Session expired" message.

### F2. Authentication
- **Login** (`POST /api/auth/login`): email + password, validation (required fields), show backend error messages (`Invalid email or password`).
- **Register** (`POST /api/auth/register`): name, email, password (min 6 chars), inline field errors, `409 "Email already registered"` handling.
- On success store token + user (`id`, `name`, `email`, `role`) in secure storage.
- Logout: clear storage, return to login.

### F3. Home / Menu Browsing
- **Menu** (`GET /api/products`): grid/list of products with image, name, price, category chip — mirrors web `/items` page.
- Category tabs/filters: **Chai | Coffee | Snacks** (the only allowed backend categories).
- Client-side search by product name.
- Pull-to-refresh.
- Image handling: `item.image` if present, else bundled fallback assets per category (chai 🍵 / coffee ☕ / snack 🥐 — same logic as web `getCartItemImage`).
- **Product detail** bottom sheet / page: image, description, price, quantity picker, "Add to Cart".

### F4. Cart
- Cart persisted locally on device (replaces web localStorage `cart`): product id, name, price, category, image, quantity.
- Quantity stepper (+/−), swipe-to-remove, per-item subtotal — same rules as web (quantity 0 removes the item).
- **Live bill breakdown** card using the exact backend formula (section 6 of `backend.md`) with settings from `GET /api/bill/settings`:
  - Subtotal, Packaging Fee (%), Platform Fee (flat), CGST + SGST (on food+packaging), GST on Platform Fee, Calculated Total, Rounding Off (ceil), **Grand Total**.
  - If settings fetch fails, fall back to the same defaults the backend uses (5%, ₹5, 2.5%, 2.5%, 18%).
- Total items count badge on the cart icon.

### F5. Checkout & Payments
- **Payment method sheet** (mirrors web modal): Grand Total shown; two options:
  - 💵 **Pay with Cash** — `POST /api/orders` with `{ items: [{product_id, quantity}], payment_mode: "CASH" }` → on success clear cart → order success screen.
  - ⚡ **UPI / Cards / Netbanking (Online)** — flow below.
- **Online payment flow** (same sequence as web, native Razorpay SDK):

```
1. POST /api/orders          payment_mode: "ONLINE"        → app order (PENDING/PENDING)
2. POST /api/payments/create { order_id }                  → razorpay_order_id, amount(paise), key_id
3. Open Razorpay checkout via razorpay_flutter
   ├─ success  → POST /api/payments/verify (order_id, razorpay_order_id,
   │             razorpay_payment_id, razorpay_signature)
   │              ├─ verified  → clear cart → Order Success (paid=1)
   │              └─ failed    → keep cart, show "payment made but not verified,
   │                             contact support with Payment ID: <id>"
   └─ failed / dismissed
        → POST /api/payments/failed { order_id, razorpay_order_id, reason }
        → **KEEP items in the cart, do NOT treat the order as placed**
        → message: "Payment didn't go through — your items are still in the cart"
```

- **Failed-payment UX requirement (matches the web fix):** if online payment fails or the user dismisses checkout, the cart must remain intact and the app must not show the order as placed. See section 10 for the one optional backend endpoint needed to also remove the ghost `PENDING` order row.
- Loading/disabled states on all pay buttons; no double-tap double orders.
- Handle no-internet before opening checkout (pre-flight `GET /api/db-test` or dio connectivity check).

### F6. Order Success
- Confirmation screen: order id, total, payment mode/status, "Track order" and "Back to menu" actions (mirrors web `/order-success?orderId=...&paid=1`).

### F7. My Orders & Tracking
- **My orders** (`GET /api/orders/my-orders`): newest first, each card shows order id, time, status badge, payment mode + payment status badge, items (name × qty, price snapshot), total.
- **Live status tracking**: status comes from `orders.status` — `PENDING → PREPARING → COMPLETED`. Poll `my-orders` every ~15–30 s while the screen is open (backend has no websockets; polling keeps backend unchanged). Visual stepper identical to web (1 Placed → 2 Kitchen → 3 Delivered).
- Pull-to-refresh; error + retry states.

### F8. Profile
- Show name/email/role, app version.
- Logout.

---

## 6. Feature List — Staff Mode (STAFF, ADMIN)

### F9. Live Order Board (replaces web `/staff`)
- **Orders** (`GET /api/orders` — returns last 24 h, newest first): cards with order #, customer name/email, time-ago, status badge, payment row (mode + status), items, total — same data as the web staff dashboard screenshot.
- Auto-refresh via polling (e.g., every 10–15 s) + pull-to-refresh; new-order highlight animation.
- Filters/tabs: All | Pending | Preparing | Completed.

### F10. Order Status Updates
- Action buttons per card calling `PATCH /api/orders/:id/status`:
  - `PENDING` → **Start Preparing**
  - `PREPARING` → **Mark Completed**
- Show backend transition errors verbatim (`"Pending order can only be moved to PREPARING"`, etc.).

### F11. Cash Payment Confirmation
- On CASH orders with `payment_status = PENDING`: **"Mark Cash Received"** → `PATCH /api/orders/:id/payment-status` with `{ "payment_status": "PAID" }`.
- Online orders show payment status read-only (`PAID`/`FAILED`/`PENDING`) — manual changes are rejected by the backend by design.

---

## 7. Feature List — Admin Console (ADMIN)

### F12. Dashboard Stats (`GET /api/dashboard/stats`)
- Period selector: `1h | 3h | 24h | 3d | 7d` (default `24h`).
- KPI cards: total orders, pending, preparing, completed, total revenue, avg order value.
- Top-5 products (bar list).
- Category performance (items sold, revenue, orders per category).
- Peak-hours chart (2-hour buckets, `12 AM – 2 AM` style labels) — shown only when `peak_hours_available` is true (`24h`/`3d`/`7d`).

### F13. Product Management
- List (`GET /api/products`), create (`POST`), edit (`PUT /:id`), delete (`DELETE /:id` with confirm dialog).
- Form validation mirrors backend: name required, price ≥ 0, category ∈ {Chai, Coffee, Snacks}, description ≤ 500 chars.
- Delete warning: removing a product also removes it from historical order items (backend cascade).

### F14. Staff Management
- Staff list (`GET /api/staff`), search (`GET /api/staff/search?q=` — name or numeric id), create (`POST /api/staff`, password ≥ 6), delete (`DELETE /api/staff/:id` with confirm).
- Never display password hashes; handle `409 "Email already registered"`.

### F15. Bill Settings
- Edit form for the five settings (`PUT /api/bill/settings`): packaging fee %, platform fee ₹, CGST %, SGST %, GST on platform fee %.
- Non-negative numeric validation; live preview of a sample bill using the calculation formula.

---

## 8. Cross-cutting Requirements

| Area | Requirement |
|---|---|
| Error handling | Every API error surfaces the backend `message`; friendly fallback text for network failures; retry affordances |
| Loading states | Skeletons/spinners for lists, button-level busy indicators (no double submits) |
| Empty states | Empty cart, empty orders, no results — with call-to-action (mirrors web "Your cart is empty" screen) |
| Offline | Detect connectivity; block checkout when offline; cart always safe locally |
| Security | JWT only in secure storage; never log tokens; no secrets in the app bundle (Razorpay `key_id` comes from `/api/payments/create`) |
| Money | Always render via `intl` `₹#,##,##0.00`; never compute totals from client prices for display-critical paths (use API `breakdown`/`total_amount` where available) |
| Theming | Material 3, orange seed color `#ea580c`, light theme first; status colors: PENDING amber, PREPARING blue, COMPLETED green, PAID green, FAILED red (match web) |
| Localization | `en` first; strings externalized (easy `hi` add-on later) |
| Platform | Android first (MVP), iOS same release where possible |

---

## 9. API ↔ Feature Map

| Feature | Endpoints used |
|---|---|
| F2 Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| F3 Menu | `GET /api/products`, `GET /api/products/:id` |
| F4 Cart bill | `GET /api/bill/settings` |
| F5 Cash checkout | `POST /api/orders` (`payment_mode: "CASH"`) |
| F5 Online checkout | `POST /api/orders` (`"ONLINE"`), `POST /api/payments/create`, `POST /api/payments/verify`, `POST /api/payments/failed` |
| F7 My orders / tracking | `GET /api/orders/my-orders` |
| F9–F11 Staff | `GET /api/orders`, `PATCH /api/orders/:id/status`, `PATCH /api/orders/:id/payment-status` |
| F12 Dashboard | `GET /api/dashboard/stats?period=` |
| F13 Products (admin) | `POST/PUT/DELETE /api/products` |
| F14 Staff (admin) | `/api/staff`, `/api/staff/search`, `/api/staff/:id` |
| F15 Bill settings (admin) | `PUT /api/bill/settings` |
| Diagnostics | `GET /`, `GET /api/db-test` |

---

## 10. Optional Backend Addition (not in MVP scope)

One known gap (also documented in `backend.md` §8.1): when an online payment fails or checkout is dismissed, the app order created in step 1 remains in the DB as `PENDING`/`FAILED` and appears as a ghost order on the staff board. The Flutter app will keep cart items and never show the order as placed regardless, but to fully clean up, add a single endpoint when ready:

```
DELETE /api/orders/:id   (owner-only; allowed only while status = PENDING
                          AND payment_status = PENDING/FAILED)
```

The app code will call it best-effort on payment failure/dismiss **if available** and ignore errors, so it works with or without the endpoint. No other backend changes are required for any feature in this document. (Phase 2 push notifications would also need a backend addition; polling is used until then.)

---

## 11. Release Plan

| Phase | Scope |
|---|---|
| **MVP (Phase 1)** | F1–F8 (full customer flow: auth, menu, cart, cash + online payments with failed-payment cart protection, order success, my orders + polling tracker, profile) |
| **Phase 2** | F9–F11 staff mode (live board, status actions, cash confirm) |
| **Phase 3** | F12–F15 admin console |
| **Phase 4** | Polish: push notifications for order-status changes (needs backend), order history pagination/search, dark mode, Hindi localization, iOS release |

### Manual test checklist (per release)
- Cash order end-to-end → order appears on staff board → status transitions → cash marked PAID.
- Online order success path → verify → cart cleared → order PAID.
- Online payment **failure** and **dismissal** → cart items intact, no "order placed" UI, failure reported to `/api/payments/failed`.
- 401 expiry mid-session → clean redirect to login.
- Admin: create/edit/delete product reflects in customer menu; bill settings change reflects in cart breakdown.
