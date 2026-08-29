Here is how it would work end-to-end.

1. Customer places an order

The customer selects their delivery location on the map.

For example:

Customer location
Latitude: 17.3850
Longitude: 78.4867

Those coordinates are already stored in the orders table.

The order initially looks like:

Order #101
Customer: Sai
Delivery location: 17.3850, 78.4867
Status: PENDING
Delivery boy: NULL
2. Staff assigns a delivery boy

When the order is ready, staff assigns a delivery boy.

The database becomes something like:

Order #101
Status: OUT_FOR_DELIVERY
Delivery boy: #7
Customer location:
    17.3850, 78.4867

This delivery_boy_id is very important.

It tells the system:

"For this order, track delivery boy #7."

3. Delivery boy starts the delivery

The delivery boy opens the delivery page in the mobile/browser app.

The app asks:

Allow this website to access your location?

He selects Allow.

The browser then provides GPS coordinates:

Latitude: 17.3921
Longitude: 78.4812

The app continuously watches his position using:

navigator.geolocation.watchPosition()

So as he moves:

10:00 → 17.3921, 78.4812
10:00:10 → 17.3915, 78.4820
10:00:20 → 17.3908, 78.4831
...

But you don't want to send GPS every second.

So the app might send one location every ~10 seconds.

4. Delivery boy sends location to your backend

Every ~10 seconds:

Delivery Boy App
       │
       │ POST /api/delivery/location
       ▼
Express Backend

Request:

{
  "latitude": 17.3908,
  "longitude": 78.4831
}

The JWT tells the backend who is sending it.

For example:

JWT user_id = 7
role = DELIVERY

The backend therefore knows:

This location belongs to delivery boy #7.

5. Backend stores the latest location

The backend updates:

delivery_locations

For example:

delivery_boy_id	latitude	longitude	updated_at
7	17.3908	78.4831	15:20:10

When he moves:

17.3908, 78.4831
        ↓
17.3899, 78.4840

the existing row is updated.

So you are not storing thousands of GPS points.

You only maintain:

"Where is delivery boy #7 right now?"

6. Customer opens "Track Delivery"

The customer sees:

Order #101
Status: OUT FOR DELIVERY

🛵 Track Delivery

When they click it:

Customer App
     │
     │ GET /api/orders/101/tracking
     ▼
Express Backend

Backend checks:

Does order #101 belong to this customer?
Is the order OUT_FOR_DELIVERY?
Who is assigned to it?
What is that delivery boy's latest location?

Then it returns something like:

{
  "orderId": 101,
  "status": "OUT_FOR_DELIVERY",
  "deliveryBoyId": 7,

  "customerLocation": {
    "latitude": 17.3850,
    "longitude": 78.4867
  },

  "deliveryBoyLocation": {
    "latitude": 17.3908,
    "longitude": 78.4831,
    "updatedAt": "2026-08-29T15:20:10"
  }
}
7. Customer's map displays both locations

The map now has two points:

             🛵
       Delivery Boy
       17.3908,78.4831
             │
             │
             │ Route
             │
             ▼
             📍
        Customer
       17.3850,78.4867

The customer's location is the destination.

The delivery boy's location is the starting point.

8. OSRM calculates the driving route

Your application can send:

Delivery Boy
      ↓
17.3908,78.4831
      ↓
OSRM
      ↓
Customer
17.3850,78.4867

OSRM returns the road route.

For example:

Distance: 2.4 km
Estimated driving time: 8 minutes
Route:
A → B → C → D → Customer

Leaflet then draws that route on the map.

Important distinction:

GPS determines where the delivery boy is.

OSRM determines how to drive from there to the customer.

9. Customer's app keeps checking

This is the important part.

The customer doesn't receive the location directly from the delivery boy.

Instead:

Delivery Boy
     │
     │ GPS every ~10 sec
     ▼
Backend
     │
     ▼
MySQL

Meanwhile:

Customer App
     │
     │ GET tracking every ~10–15 sec
     ▼
Backend
     │
     ▼
MySQL

So you effectively have two independent loops.

Delivery boy
GPS
 ↓
POST location
 ↓
Database
 ↓
wait 10 sec
 ↓
GPS again
Customer
GET tracking
 ↓
Display location
 ↓
wait 10–15 sec
 ↓
GET tracking again
 ↓
Move marker
 ↓
Update route
10. Example of the movement

Imagine the delivery boy starts here:

🛵 Delivery Boy
17.4000, 78.4700

          4 km

📍 Customer
17.3850, 78.4867

After 10 seconds:

🛵
17.3980, 78.4720

          3.7 km

📍
Customer

After another 10 seconds:

      🛵
17.3950, 78.4760

       3.0 km

📍
Customer

The customer's map keeps moving the 🛵 marker.

So visually, the customer sees:

"The delivery boy is approaching me."

11. What happens if the delivery boy closes the app?

Suppose the last location was:

17.3908, 78.4831

The customer might still see that location.

But the backend also returns:

updatedAt: 15:20:10

If the current time is:

15:25:30

you know the location is 5 minutes old.

Your UI can show:

⚠️ Location last updated 5 minutes ago

instead of pretending it is live.

This is a very important feature.

12. What happens when delivery is completed?

Once the order becomes:

COMPLETED

the customer tracking stops.

The frontend stops polling:

GET /api/orders/101/tracking

And you can hide:

🛵 Track Delivery

So tracking exists only during:

OUT_FOR_DELIVERY

The complete flow is:

                 ┌─────────────────────┐
                 │     DELIVERY BOY     │
                 │                     │
                 │   Phone/Browser     │
                 │        │            │
                 │        │ GPS        │
                 └────────┼────────────┘
                          │
                          │ POST location
                          ▼
                 ┌─────────────────────┐
                 │   EXPRESS BACKEND   │
                 │                     │
                 │  Validate JWT       │
                 │  Identify boy #7    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       MYSQL         │
                 │                     │
                 │ delivery_locations  │
                 │       boy #7        │
                 └──────────┬──────────┘
                            │
                  GET every 10–15 sec
                            │
                            ▼
                 ┌─────────────────────┐
                 │    CUSTOMER APP     │
                 │                     │
                 │ 🛵 Delivery Boy     │
                 │ 📍 Customer         │
                 └──────────┬──────────┘
                            │
                            ▼
                         OSRM
                            │
                            ▼
                     Driving Route
                            │
                            ▼
                    🗺️ Leaflet Map
One important point

This does not require the delivery boy and customer to be using the same device or network.

For example:

Delivery boy's Android phone
          │
       Internet
          │
          ▼
     Your backend
          │
       MySQL
          │
       Internet
          │
          ▼
Customer's Android phone

They can be completely different devices and location