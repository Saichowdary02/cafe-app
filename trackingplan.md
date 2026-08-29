# Tracking Plan — Customer Tracks Delivery of an Order

This plan describes how to implement **live delivery tracking** for the customer, so they can watch the delivery boy's 🛵 approach their 📍 location on a map while the order is `OUT_FOR_DELIVERY`.

It builds on what already exists in this repo:

- `orders` table already stores `latitude`, `longitude` (customer's chosen delivery location) and `delivery_boy_id` (`server/config/schema.sql`).
- Customer picks a location at checkout (`client/app/cart/page.js` + `DeliveryLocationPicker`).
- Staff/Admin assign a delivery boy via `PATCH /api/delivery/orders/:id/assign` (`server/controllers/deliveryController.js`).
- Delivery boy already sees an OSRM route to the customer (`client/components/maps/DeliveryRouteMap.jsx` + `client/services/routingService.js`).
- Auth is JWT-based with role middleware (`server/middleware/authMiddleware.js`, `roleMiddleware.js`).

> Note: this codebase's final status is **`DELIVERED`** (not `COMPLETED`). Tracking stops at `DELIVERED`.

---

## Architecture Overview

Two independent loops, connected only through the backend + MySQL:

```
DELIVERY BOY (phone/browser)                 CUSTOMER (phone/browser)
  GPS via watchPosition()                      Poll tracking API
        │ every ~10 sec                              │ every ~10–15 sec
        │ POST /api/delivery/location                │ GET /api/orders/:id/tracking
        ▼                                            ▼
  ┌─────────────────────────────────────────────────────┐
  │              EXPRESS BACKEND (port 5000)            │
  │  authMiddleware (JWT) → identifies delivery boy     │
  │  validate coordinates → upsert location             │
  │  verify order ownership → return tracking snapshot  │
  └───────────────────────┬─────────────────────────────┘
                          ▼
                     MYSQL (cafe_app)
                   delivery_locations table
                          ▲
                          │ OSRM driving route
                          ▼
                 Leaflet map (react-leaflet)
```

---

## Phase 1 — Database

### 1.1 New table: `delivery_locations`

One row **per delivery boy** — always updated in place ("where is boy #7 right now?"), never history.

```sql
CREATE TABLE IF NOT EXISTS delivery_locations (
    delivery_boy_id INT NOT NULL PRIMARY KEY,
    latitude        DECIMAL(10,8) NOT NULL,
    longitude       DECIMAL(11,8) NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dlivery_loc_boy
        FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 1.2 Migration script

Create `server/migrate-tracking.js` following the existing pattern of `server/migrate-delivery.js` / `migrate-order-status.js`: run the `CREATE TABLE`, then exit. Also append the `CREATE TABLE` to `server/config/schema.sql` so fresh installs get it.

### 1.3 (Optional) cleanup on completion

When an order is marked `DELIVERED`, optionally `DELETE FROM delivery_locations WHERE delivery_boy_id = ?` so stale rows don't linger. Keeping the row is also fine — the UI just relies on `updated_at` staleness instead.

---

## Phase 2 — Backend API

### 2.1 `POST /api/delivery/location` — delivery boy pushes his GPS

Add to `server/routes/deliveryRoutes.js`:

```js
router.post(
    "/location",
    authMiddleware,
    authorizeRoles("DELIVERY"),
    updateMyLocation
);
```

New handler `updateMyLocation` in `server/controllers/deliveryController.js`:

1. Read `latitude`, `longitude` from `req.body`; validate they are finite numbers within valid ranges (`-90..90`, `-180..180`) — mirror the validation already in `orderController.js` (`createOrder`).
2. Use `req.user.id` from the JWT as `delivery_boy_id` (never trust a body-supplied ID).
3. Upsert (single row per boy):

```sql
INSERT INTO delivery_locations (delivery_boy_id, latitude, longitude)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude);
```

4. Respond `200 { "message": "Location updated" }`. Errors: `400 "Invalid coordinates"`, `401/403` from middleware, `500` internal.

### 2.2 `GET /api/orders/:id/tracking` — customer polls tracking

Add to `server/routes/orderRoutes.js`:

```js
router.get(
    "/orders/:id/tracking",
    authMiddleware,
    getDeliveryTracking
);
```

New handler `getDeliveryTracking` (in `orderController.js`, following the ownership-check pattern of `getMyOrder`):

1. Look up the order: `SELECT id, user_id, status, delivery_boy_id, latitude, longitude, delivery_address FROM orders WHERE id = ?`.
2. `404` if missing. `403` if `order.user_id !== req.user.id` (customers can only track their own orders).
3. If `status !== 'OUT_FOR_DELIVERY'`, return `200` with the current status but `deliveryBoyLocation: null` — the frontend uses this to know when to stop polling.
4. If `delivery_boy_id` is `NULL`, return `deliveryBoyLocation: null` as well.
5. Otherwise join the latest location:

```sql
SELECT dl.latitude, dl.longitude, dl.updated_at
FROM delivery_locations dl
WHERE dl.delivery_boy_id = ?
```

6. Respond:

```json
{
    "message": "Tracking data retrieved successfully",
    "tracking": {
        "orderId": 101,
        "status": "OUT_FOR_DELIVERY",
        "deliveryBoyId": 7,
        "customerLocation": { "latitude": 17.3850, "longitude": 78.4867 },
        "deliveryBoyLocation": {
            "latitude": 17.3908,
            "longitude": 78.4831,
            "updatedAt": "2026-08-29T15:20:10"
        }
    }
}
```

Note: the backend does **not** call OSRM. It returns raw coordinates; the client computes the route (consistent with the existing `routingService.js` design).

---

## Phase 3 — Delivery Boy Client (location sender)

New component `client/components/maps/LiveLocationSender.jsx` (or inline logic in `client/app/delivery/page.js`):

1. On mount, when the delivery boy has an order marked `OUT_FOR_DELIVERY`, request geolocation permission.
2. Start `navigator.geolocation.watchPosition(...)` with `enableHighAccuracy: true`.
3. **Throttle** to at most one POST every ~10 seconds (track `lastSentAt` in a ref; ignore intermediate fixes).
4. Each send:

```js
fetch("http://localhost:5000/api/delivery/location", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
});
```

5. Handle failures silently (network hiccup → try again on next fix); show a small "📍 Live location sharing: ON/OFF" indicator.
6. On unmount, or when the order becomes `DELIVERED`, call `clearWatch()` and stop sending.
7. Also update `DeliveryRouteMap` to re-fetch the OSRM route on an interval (~15 s) so the boy's own route/ETA stays fresh.

---

## Phase 4 — Customer Client (tracking UI)

### 4.1 Service function

In `client/services/` (e.g. `trackingService.js`):

```js
export async function getTracking(orderId, token) { ... }   // GET /api/orders/:id/tracking
```

### 4.2 New map component `client/components/maps/OrderTrackingMap.jsx`

Model it on `DeliveryRouteMap.jsx`:

- Props: `customerLocation: {latitude, longitude}`, `deliveryBoyLocation: {latitude, longitude, updatedAt}`.
- Markers: 🛵 (orange, existing `scooterIcon`) at the delivery boy, 📍 (blue `customerIcon`) at the customer.
- On each new `deliveryBoyLocation`, call `getDrivingRoute(boyLat, boyLng, customerLat, customerLng)` from `routingService.js` and draw the route with `<Polyline>`; show distance + ETA via `formatDistance`/`formatDuration`.
- Recenter/map-follow: keep both markers in view (`L.latLngBounds([boy, customer])` + `map.fitBounds`), but don't jump the camera on every poll — move the marker smoothly, pan only when both fall out of view.
- Stale-location banner: if `Date.now() - new Date(updatedAt) > 2 minutes`, show `⚠️ Location last updated X minutes ago` instead of implying it's live.

### 4.3 Add "Track Delivery" to the customer's orders page (`client/app/orders/page.js`)

- For orders where `status === 'OUT_FOR_DELIVERY'` and `delivery_boy_id != null`, render a `🛵 Track Delivery` button on the order card.
- Clicking expands the card to show `<OrderTrackingMap />` (load with `dynamic(() => import(...), { ssr: false })`, same as the existing map usage).
- **Polling loop**: `setInterval` of 10–15 s calling `getTracking(orderId, token)` while expanded and `status === 'OUT_FOR_DELIVERY'`:
  - Update `deliveryBoyLocation` state → map marker + route re-render.
  - When `status` becomes `DELIVERED`, stop polling, show "✅ Delivered", hide the track button.
- Only one order's tracking should be actively polling at a time (gate polling to the expanded card) to avoid hammering the API.

---

## Phase 5 — Edge Cases & Polish

| Scenario | Behavior |
|---|---|
| Delivery boy denies/closes app | `updatedAt` grows stale → customer sees "⚠️ last updated X min ago" |
| Boy has no row yet in `delivery_locations` | `deliveryBoyLocation: null` → UI shows "Waiting for delivery boy to start sharing location..." |
| Order has no customer coordinates (`latitude` null) | Hide the Track button (can't map it) — same guard `order.latitude != null` used elsewhere |
| Order not `OUT_FOR_DELIVERY` | Tracking endpoint returns status only; frontend stops polling & hides button |
| Delivery boy reassigned mid-delivery | Tracking endpoint re-reads `delivery_boy_id` each poll → new boy's location appears automatically |
| API failure during polling | Show inline error, keep polling (don't kill the interval) |

---

## Implementation Order (suggested commits)

1. `server/migrate-tracking.js` + `schema.sql` update → run migration.
2. Backend: `updateMyLocation` in `deliveryController.js` + route in `deliveryRoutes.js`.
3. Backend: `getDeliveryTracking` in `orderController.js` + route in `orderRoutes.js`.
4. Client: `LiveLocationSender` in the delivery page.
5. Client: `OrderTrackingMap.jsx` + `trackingService.js`.
6. Client: "Track Delivery" button + polling in `client/app/orders/page.js`.
7. Test end-to-end (see below).

---

## Manual Testing Checklist

1. Place an order with a map-picked delivery location (cart page).
2. As ADMIN/KITCHEN, assign a delivery boy when the order is ready.
3. As the delivery boy (different browser/device/profile), open the delivery page, accept location permission, mark the order `OUT_FOR_DELIVERY` — verify `POST /api/delivery/location` fires every ~10 s and `delivery_locations` shows one updated row.
4. As the customer, open My Orders → click 🛵 Track Delivery → verify both markers, the road route, distance/ETA appear.
5. Move the delivery device (or simulate GPS in DevTools → Sensors) — verify the 🛵 marker and route update within ~15 s without a page refresh.
6. Verify the stale-location warning by pausing location sharing for >2 min.
7. Mark the order `DELIVERED` — verify polling stops and the track UI disappears.
8. Verify another customer cannot `GET /api/orders/:id/tracking` for someone else's order (expect `403`).

