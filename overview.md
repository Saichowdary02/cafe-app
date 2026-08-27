# Cafe App — High-Level Overview
## 1. Tech Stack
### Frontend
Technology |  Role 

Next.js (App Router)  Routing, layouts, client components 
UI | React |  Component-based UI |
Styling | Tailwind CSS  styling |


### Backend 
| Layer | Technology 

| Runtime | Node.js 
| Framework  Express.js 
| Auth | `jsonwebtoken` 
| Password hashing | `bcrypt` 
| Payments | `razorpay` (official SDK) 
| DB client | `mysql2/promise` 

### Database

 MySQL
 db-name  `cafe_app` 
Core tables:   `users`, `products`, `orders`, `order_items`, `payments`, `bill_settings`


## Roles & High-Level Feature Matrix

Three roles={user,staff,admin} 
 (self-registration = `USER`) 
 admin can create STAFF


 **USER** (Customer) 
 Self-registered via `/register`
  Browse menu, cart, pay, track own orders 

| **STAFF** (Kitchen / Counter)
  Created by Admin at `/staff` 
   Order management: status updates, cash collection, receipts 


| **ADMIN** 
 what STAFF can do + staff management + analytics dashboard +bill settings+manage products

 admin-only has (Dashboard, Manage Products(crud), Staff, Bill Settings) 

## 3. Features by Role

### 🧑 USER (Customer)

Register (name, email, password ≥ 6 chars), Login, Logout
Navbar  profile  menu |

| Menu | Browse all products with category filter tabs (All / Chai / Coffee / Snacks) and live search; expandable descriptions; "See more" 

| Cart | Add / increment / decrement / remove items;
 quantity stepper, per-item subtotal, "in cart" badge on cards; cart persisted in `localStorage` | `/items` + `/cart` |

| Bill | Live bill breakdown (subtotal, packaging fee %, flat platform fee, CGST + SGST on food+packaging, GST on platform fee, ceil rounding, grand total)

| Checkout | "Place Order" 
 payment method modal with two options: **Pay with Cash** (counter) or **UPI / Cards / Netbanking** (Razorpay Checkout) 

 My orders | Order history with progress stepper (Placed → Kitchen → Delivered), payment mode/status badges, items, total; pull-to-refresh; search & sort; IST-formatted timestamps | `/orders` (USER view) 

### 👨‍🍳 STAFF (Kitchen / Counter)

| Live order board | All orders from the last 24 h (newest first), auto-loaded; status & payment badges, customer info, items, total | `

| Filtering & search | Status tabs ( Pending / Preparing / Completed), search by order #, customer, item; sort by Newest / Oldest / Price | `/orders` |

| Order status flow | `Pending → Preparing → Mark as Delivered (Completed)` with backend-enforced transitions; toast feedback on each action | `/orders` action buttons |

| Cash collection | "💵 Mark Cash Received" button on unpaid CASH orders

| Receipt / thermal print | View bill breakdown modal + "Print Receipt" (locked until `payment_status = PAID`); generates 80 mm thermal-style HTML in an iframe and triggers `window.print()` | `/orders` receipt modal |

### 🛠️ ADMIN

Includes everything STAFF can do, plus:

| Staff management | List all STAFF accounts, debounced search by name/ID, create new staff (name/email/password ≥ 6), delete with confirm modal 

| Dashboard analytics | Period filter (1 h / 3 h / 24 h / 3 d / 7 d, default 24 h). KPI cards: Total Orders, Pending, Preparing, Delivered, Total Revenue, Avg Order Value 

| Top products | Top 5 best-selling products in the selected period |

| Category performance | Items sold, revenue, % share, orders count per category (Chai / Coffee / Snacks) with gradient bars 

| Peak hours | 2-hour bucket distribution of orders across the day (12 AM – 2 AM, … 10 PM – 12 AM), with the busiest bucket highlighted — only available for 24 h / 3 d / 7 d windows 

---

## 4. Pages × Roles Access Map

| Page | Path | Public | USER | STAFF | ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| Home / Hero | `/home` | – | ✅ | ✅ | ✅ |
| Register | `/register` | ✅ | – | – | – |
| Login | `/login` | ✅ | – | – | – |
| Menu | `/items` | – | ✅ | ✅ | ✅ |
| Cart | `/cart` | – | ✅ | ✅ | ✅ |
| Order success | `/order-success` | – | ✅ | ✅ | ✅ |
| My orders / Live orders | `/orders` | – | own only | last 24 h | last 24 h |
| Staff management | `/staff` | – | ❌ | ❌ | ✅ |
| Dashboard analytics | `/dashboard` | – | ❌ | ❌ | ✅ |


