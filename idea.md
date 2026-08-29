# Cafe App — Delivery Location & Route Management

## 1. Project Overview

The Cafe App is a food ordering application where customers can browse products, add items to their cart, and place orders.

The application must now support **delivery location selection and delivery routing** using:

* **OpenStreetMap** — map display
* **Leaflet / React-Leaflet** — interactive map in the Next.js web application
* **OSRM (Open Source Routing Machine)** — driving route calculation
* **Browser Geolocation API** — obtain the current location of the customer and delivery boy

The objective is to allow a customer to select a delivery location from a map when placing an order and allow the admin and delivery boy to view that location. The delivery boy should also be able to see the driving route from their current location to the customer's delivery location.

---

# 2. Main Requirement

When a customer places an order:

1. The customer selects their delivery location using an interactive OpenStreetMap map.
2. The application obtains the selected:

   * Latitude
   * Longitude
3. The selected location is stored with the order.
4. Admin can view the customer's delivery location.
5. Delivery boy can view the customer's delivery location.
6. Delivery boy's current GPS location is obtained from the browser/device.
7. The application sends:

   * Delivery boy's current latitude/longitude
   * Customer's delivery latitude/longitude
     to OSRM.
8. OSRM returns a driving route.
9. The route is displayed on OpenStreetMap.
10. Delivery boy can visually follow the route to the customer's location.

---

# 3. Technology Stack

Use the existing project stack.

## Frontend

* Next.js
* React
* JavaScript / JSX
* Tailwind CSS
* Leaflet
* React-Leaflet

## Backend

* Node.js
* Express.js
* Existing authentication and authorization middleware

## Database

* MySQL
* Existing `cafe_app` database

## Maps

### Map Provider

OpenStreetMap

### Map Library

Leaflet / React-Leaflet

### Routing Engine

OSRM

### Location

Browser Geolocation API

Do NOT introduce Google Maps unless explicitly requested.

---

# 4. User Roles

The application currently has:

```text
CUSTOMER
ADMIN
STAFF
```

A delivery role should be supported if it does not already exist:

```text
DELIVERY_BOY
```

The delivery boy should have access only to delivery-related functionality.

---

# 5. Customer Flow

## Step 1 — Customer adds products

Customer:

```text
Menu
  ↓
Add products
  ↓
Cart
  ↓
Checkout
```

## Step 2 — Select delivery location

Before placing the order, show:

```text
Delivery Location

[ Interactive OpenStreetMap ]

[ Use My Current Location ]

[ Confirm Location ]
```

The customer should be able to:

### Option A — Select manually

The customer clicks/taps on the map.

A marker should appear at the selected position.

Example:

```text
Customer clicks map
        ↓
       📍
        ↓
latitude + longitude
```

### Option B — Use current location

The application should request browser location permission.

If permission is granted:

```text
Browser GPS
    ↓
Latitude + Longitude
    ↓
Move map to current location
    ↓
Display marker
```

The customer can then adjust the location manually if necessary.

---

# 6. Selected Location

When the customer selects a location, store:

```json
{
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

The customer should be able to see the selected coordinates before confirming.

Example UI:

```text
Selected Delivery Location

Latitude: 17.385044
Longitude: 78.486671

[ Confirm Location ]
```

---

# 7. Address

If possible, implement reverse geocoding so that coordinates can also be converted into a readable address.

Example:

```text
Latitude:
17.385044

Longitude:
78.486671

Address:
123 Main Road, Hyderabad, Telangana
```

The address should be stored along with the coordinates.

Important:

The latitude and longitude are the authoritative location data. The textual address should be treated as supplementary information.

---

# 8. Order Creation

When the customer places an order, the frontend should send delivery information along with the existing order data.

Example:

```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    },
    {
      "product_id": 4,
      "quantity": 1
    }
  ],
  "delivery_address": "123 Main Road, Hyderabad",
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

Do not create a separate order just for location.

The location belongs to the order.

---

# 9. Database Changes

Modify the existing `orders` table.

Recommended fields:

```sql
delivery_address VARCHAR(500)
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
```

Example:

```text
orders

id
user_id
total_amount
status
delivery_address
latitude
longitude
created_at
```

Do not duplicate latitude/longitude into `order_items`.

The location belongs to the complete order.

---

# 10. Admin Functionality

Admin should be able to see the delivery location for an order.

Example:

```text
Order #25

Customer:
Sai

Total:
₹180

Status:
PREPARING

Delivery Address:
123 Main Road, Hyderabad

Delivery Location:

┌──────────────────────────────┐
│                              │
│       OpenStreetMap          │
│              📍              │
│                              │
└──────────────────────────────┘
```

The admin should be able to:

* View delivery address
* View latitude
* View longitude
* View location on map
* Assign a delivery boy
* See delivery status

---

# 11. Delivery Boy Functionality

The delivery boy should have a dedicated delivery/order screen.

Example:

```text
My Deliveries

Order #25

Customer:
Sai

Address:
123 Main Road, Hyderabad

Status:
READY FOR DELIVERY

[ View Route ]
```

When the delivery boy opens the route:

```text
Current Delivery

Customer:
Sai

Delivery Address:
123 Main Road, Hyderabad

Distance:
4.2 km

Estimated Time:
12 min

┌────────────────────────────────┐
│                                │
│       OpenStreetMap            │
│                                │
│      🛵                        │
│       ╲                        │
│        ╲                       │
│         ╲                      │
│          ╲──────────→ 📍       │
│                                │
└────────────────────────────────┘

[ Start Delivery ]

[ Mark Delivered ]
```

---

# 12. Delivery Boy Current Location

When the delivery boy opens a delivery:

Use the browser Geolocation API.

Example:

```javascript
navigator.geolocation.getCurrentPosition(...)
```

Obtain:

```json
{
  "latitude": 17.4000,
  "longitude": 78.4800
}
```

This represents the delivery boy's current location.

Do NOT permanently store the delivery boy's location in the order just for calculating a route.

The delivery boy's current position is dynamic.

---

# 13. Route Calculation

The route should be calculated between:

```text
START:
Delivery Boy's current location

END:
Customer's delivery location
```

Example:

```text
Delivery Boy
17.4000, 78.4800

Customer
17.3850, 78.4867
```

Send these coordinates to OSRM.

Conceptually:

```text
Delivery Boy GPS
      +
Customer GPS
      ↓
     OSRM
      ↓
Driving Route
      ↓
Route Coordinates
      ↓
Leaflet
      ↓
OpenStreetMap
```

---

# 14. Route Display

OSRM returns route geometry.

The frontend should convert the returned route geometry into coordinates that Leaflet can display.

Use a Leaflet polyline to draw the route.

Example concept:

```text
🛵
 │
 │
 └─────┐
       │
       │
       └──────────→ 📍
```

The route should follow actual roads rather than drawing a straight line between the two points.

---

# 15. Distance and ETA

The route response should provide:

```text
Distance
Duration
Route geometry
```

Display:

```text
Distance: 4.2 km
Estimated time: 12 minutes
```

Use OSRM's returned route information rather than calculating a straight-line distance.

---

# 16. Shortest vs Fastest Route

The system should distinguish between:

### Shortest Distance

Route optimized for minimum road distance.

```text
Minimum kilometers
```

### Fastest Route

Route optimized for travel time.

```text
Minimum estimated travel time
```

### Best Driving Route

Use the routing engine's normal driving profile and road-network rules.

For a delivery application, the default should be the **best/fast driving route**, not simply the straight-line shortest distance.

---

# 17. Traffic Limitation

OSRM should NOT be presented as a live traffic navigation service.

The initial implementation does not require live traffic.

The application should calculate a route using available road-network data.

Do not claim that the ETA accounts for real-time traffic.

If live traffic routing is required later, the routing architecture can be replaced or extended with a traffic-aware provider.

---

# 18. Live Delivery Tracking — Future Feature

The first implementation does NOT need full live tracking.

However, design the code so that live tracking can be added later.

Future architecture:

```text
Delivery Boy GPS
      ↓
Periodic Location Updates
      ↓
Backend / WebSocket
      ↓
Customer / Admin
      ↓
Live Map
```

Future features may include:

* Live delivery boy marker
* Customer watching delivery
* Automatic route recalculation
* Off-route detection
* Turn-by-turn instructions
* Live ETA
* Delivery tracking page

Do not implement these unless explicitly requested.

---

# 19. API Design

Use the existing API architecture.

Possible endpoints:

## Create Order

```http
POST /api/orders
```

Request:

```json
{
  "items": [],
  "delivery_address": "123 Main Road",
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

---

## Get Customer Orders

```http
GET /api/orders/my-orders
```

Response should include delivery information.

---

## Admin Get All Orders

```http
GET /api/orders
```

Admin/Staff should receive:

```json
{
  "id": 25,
  "status": "PREPARING",
  "total_amount": 180,
  "delivery_address": "123 Main Road",
  "latitude": 17.385044,
  "longitude": 78.486671
}
```

---

## Get Delivery Boy Orders

If required:

```http
GET /api/delivery/orders
```

Only assigned deliveries should be returned.

---

# 20. Delivery Assignment

If delivery-boy functionality already exists, reuse it.

If not, add order assignment.

Recommended relationship:

```text
orders
   │
   └── delivery_boy_id
```

Example:

```sql
delivery_boy_id INT NULL
```

Then:

```text
Order #25
     ↓
Assigned to
     ↓
Delivery Boy #4
```

Only the assigned delivery boy should normally see the delivery details.

Admin should be able to see all deliveries.

---

# 21. Order Status

Keep the existing order status flow unless the current codebase requires modification.

A possible delivery flow:

```text
PENDING
   ↓
PREPARING
   ↓
READY_FOR_DELIVERY
   ↓
ASSIGNED
   ↓
OUT_FOR_DELIVERY
   ↓
COMPLETED
```

Do not unnecessarily break the existing order workflow.

If the current project already has defined statuses, extend them carefully rather than replacing them.

---

# 22. Map Components

Create reusable map components rather than duplicating map logic.

Suggested structure:

```text
components/
└── maps/
    ├── DeliveryLocationPicker.jsx
    ├── DeliveryLocationMap.jsx
    └── DeliveryRouteMap.jsx
```

### DeliveryLocationPicker

Used by customer.

Responsibilities:

* Display map
* Allow clicking map
* Show selected marker
* Get current location
* Return latitude/longitude
* Confirm selected location

### DeliveryLocationMap

Used by admin.

Responsibilities:

* Display customer delivery location
* Display marker
* Optionally display address

### DeliveryRouteMap

Used by delivery boy.

Responsibilities:

* Get current delivery boy location
* Display customer marker
* Request route
* Display route polyline
* Display distance
* Display ETA

---

# 23. Next.js Considerations

Leaflet requires browser APIs.

Do not render the interactive Leaflet map using normal server-side rendering.

Use a client component:

```javascript
"use client";
```

If necessary, dynamically import the map:

```javascript
const Map = dynamic(
  () => import("@/components/maps/DeliveryRouteMap"),
  {
    ssr: false
  }
);
```

Make sure Leaflet CSS is loaded correctly.

---

# 24. Security

Do not trust location data from the frontend blindly.

Backend should validate:

```text
latitude
longitude
```

Expected ranges:

```text
Latitude:
-90 to +90

Longitude:
-180 to +180
```

Also:

* Customer should only be able to create/update their own order location before order completion.
* Admin can view all delivery locations.
* Delivery boy can only view assigned delivery locations.
* Do not expose unrelated customer data.
* Existing JWT authentication and role middleware must continue to be used.

---

# 25. Error Handling

Handle these cases:

### Location permission denied

Display:

```text
Location permission was denied.
Please select your delivery location manually on the map.
```

### GPS unavailable

Allow manual map selection.

### Invalid coordinates

Reject the order location.

### Routing service unavailable

Display:

```text
Unable to calculate the route right now.
Please try again.
```

Do not prevent the customer from placing an order merely because route calculation is unavailable.

### No route found

Display:

```text
No driving route could be found for this location.
Please select another delivery location.
```

---

# 26. Important OpenStreetMap Requirement

When displaying OpenStreetMap tiles, include proper attribution:

```text
© OpenStreetMap contributors
```

Do not remove the attribution.

Do not treat the public OpenStreetMap tile server as an unlimited production API.

The implementation should keep the map provider configurable so that another tile provider can be introduced later if required.

---

# 27. Important Routing Requirement

Keep the routing layer separate from the UI.

Do not put OSRM request logic directly throughout React components.

Prefer a structure such as:

```text
services/
└── routingService.js
```

Example responsibility:

```javascript
getDrivingRoute(
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude
)
```

This makes it easier to replace OSRM with another routing provider later.

---

# 28. Data Flow

Complete flow:

```text
                    CUSTOMER
                       │
                       ▼
                  Add Products
                       │
                       ▼
                     Cart
                       │
                       ▼
                    Checkout
                       │
                       ▼
             Select Delivery Location
                       │
                       ▼
                OpenStreetMap
                       │
                 📍 Select Point
                       │
                       ▼
                Latitude/Longitude
                       │
                       ▼
                  Place Order
                       │
                       ▼
                    Backend
                       │
                       ▼
                    MySQL
                       │
             ┌─────────┴──────────┐
             ▼                    ▼
           ADMIN            DELIVERY BOY
             │                    │
       View Location        Get Current GPS
             │                    │
             │                    ▼
             │                   OSRM
             │                    │
             │             Calculate Route
             │                    │
             │                    ▼
             │              Route Geometry
             │                    │
             └──────────┬─────────┘
                        ▼
                 OpenStreetMap
                        │
                        ▼
              🛵 ───────────→ 📍
```

---

# 29. UI/UX Requirements

The map should be responsive and usable on:

* Desktop
* Tablet
* Mobile browser

The customer should not need to manually type latitude/longitude.

The customer should primarily interact with:

```text
Click map
OR
Use My Current Location
```

The delivery boy should see:

```text
Current Location
        ↓
Driving Route
        ↓
Customer Location
```

Use clear markers:

```text
🛵 = Delivery Boy
📍 = Customer
```

Use different visual markers/icons in the actual application rather than relying on emoji.

---

# 30. Implementation Strategy

Implement incrementally.

## Phase 1

Implement:

* Leaflet
* OpenStreetMap
* Customer location picker
* Manual map selection
* Current location button
* Latitude/longitude capture

## Phase 2

Implement:

* Database changes
* Order API changes
* Save location with order
* Retrieve location with order

## Phase 3

Implement:

* Admin delivery location map
* Delivery boy delivery screen
* Delivery assignment

## Phase 4

Implement:

* Delivery boy GPS
* OSRM integration
* Route calculation
* Route display
* Distance
* ETA

## Phase 5 — Future

Only if requested:

* Live delivery tracking
* WebSockets
* Automatic route recalculation
* Off-route detection
* Turn-by-turn navigation

---

# 31. Development Rules

Before implementing:

1. Inspect the existing project structure.
2. Understand the existing authentication system.
3. Understand the existing order creation flow.
4. Understand the existing database schema.
5. Reuse existing components and APIs wherever possible.
6. Do not rewrite working functionality unnecessarily.
7. Do not create duplicate authentication or order systems.
8. Maintain existing Admin/Staff/Customer permissions.
9. Keep map functionality modular.
10. Keep OSRM routing logic separate from UI components.

After implementation:

* Test customer location selection.
* Test current location.
* Test order creation with coordinates.
* Test database persistence.
* Test admin location display.
* Test delivery boy access.
* Test route calculation.
* Test route rendering.
* Test invalid location.
* Test denied GPS permission.
* Test routing failure.

---

# 32. Final Expected Result

The completed system should provide this experience:

### Customer

```text
Cart
 ↓
Checkout
 ↓
Select Delivery Location
 ↓
OpenStreetMap
 ↓
Select location / Use current location
 ↓
Confirm location
 ↓
Place Order
```

### Admin

```text
Orders
 ↓
Open Order
 ↓
View Customer Delivery Location
 ↓
OpenStreetMap
 ↓
📍 Customer
```

### Delivery Boy

```text
Assigned Orders
 ↓
Open Delivery
 ↓
Get Current Location
 ↓
OSRM
 ↓
Calculate Driving Route
 ↓
OpenStreetMap
 ↓
🛵 ─────────→ 📍
```

The key objective is:

> **The customer selects a delivery location on the map, that location is stored with the order, the admin and assigned delivery boy can view it, and the delivery boy can see a road-following driving route from their current location to the customer's delivery location.**
