"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";
import { calculateBillBreakdown, DEFAULT_BILL_SETTINGS } from "@/lib/billCalculator";

function StatusBadge({ status }) {
    if (status === "PENDING") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-bold tracking-wide text-amber-800 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                PENDING
            </span>
        );
    }
    if (status === "PREPARING") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/80 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-800 shadow-xs">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                PREPARING
            </span>
        );
    }
    if (status === "COMPLETED") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800 shadow-xs">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                COMPLETED
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-700">
            {status}
        </span>
    );
}

function formatToIST(utcTimestamp) {
    if (!utcTimestamp) return "";
    const date = new Date(utcTimestamp);
    return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function getRelativeTime(utcTimestamp) {
    if (!utcTimestamp) return "";
    const now = new Date();
    const past = new Date(utcTimestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    return `${diffInDays}d ago`;
}

function OrderProgressBar({ status }) {
    const steps = [
        { label: "Placed", key: "PENDING" },
        { label: "Kitchen", key: "PREPARING" },
        { label: "Ready", key: "COMPLETED" },
    ];

    let currentStepIndex = 0;
    if (status === "PREPARING") currentStepIndex = 1;
    if (status === "COMPLETED") currentStepIndex = 2;

    return (
        <div className="mt-3.5 px-1">
            <div className="relative flex items-center justify-between">
                {/* Connecting background line */}
                <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rounded-full bg-stone-200" />

                {/* Active progress line */}
                <div
                    className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ${currentStepIndex === 0
                            ? "w-[10%] bg-amber-500"
                            : currentStepIndex === 1
                                ? "w-[50%] bg-blue-500"
                                : "w-full bg-emerald-500"
                        }`}
                />

                {steps.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    let circleClass = "border-stone-300 bg-white text-stone-400";
                    if (isDone) {
                        if (currentStepIndex === 0) circleClass = "border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/30";
                        else if (currentStepIndex === 1 && idx === 1) circleClass = "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30";
                        else if (currentStepIndex >= 1 && idx === 0) circleClass = "border-emerald-500 bg-emerald-500 text-white";
                        else if (currentStepIndex === 2) circleClass = "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
                    }

                    return (
                        <div key={step.label} className="relative z-10 flex flex-col items-center">
                            <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300 ${circleClass} ${isCurrent && status !== "COMPLETED" ? "scale-110 ring-2 ring-orange-200" : ""
                                    }`}
                            >
                                {isDone && idx < currentStepIndex ? (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span
                                className={`mt-1 text-[10px] font-semibold tracking-tight transition-colors ${isCurrent
                                        ? "text-stone-900 font-bold"
                                        : isDone
                                            ? "text-stone-600"
                                            : "text-stone-400"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [toast, setToast] = useState(null);
    const [billSettings, setBillSettings] = useState(DEFAULT_BILL_SETTINGS);

    // Filters and Search state
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("NEWEST");
    const [receiptOrder, setReceiptOrder] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token || !userData) {
            router.push("/login");
            return;
        }

        try {
            const loggedInUser = JSON.parse(userData);
            setUser(loggedInUser);
            fetchOrders(token, loggedInUser.role);
        } catch (err) {
            console.error(err);
            localStorage.removeItem("user");
            router.push("/login");
        }

        // Fetch live bill settings so receipt uses admin-configured rates
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        fetch(`${apiUrl}/api/bill/settings`)
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data?.settings) {
                    setBillSettings({
                        packaging_fee_percent: Number(data.settings.packaging_fee_percent),
                        platform_fee: Number(data.settings.platform_fee),
                        cgst_percent: Number(data.settings.cgst_percent),
                        sgst_percent: Number(data.settings.sgst_percent),
                        platform_fee_gst_percent: Number(data.settings.platform_fee_gst_percent),
                    });
                }
            })
            .catch((err) => console.error("Failed to fetch bill settings:", err));
    }, []);

    const fetchOrders = async (token, role, isManualRefresh = false) => {
        try {
            if (isManualRefresh) setRefreshing(true);
            else setLoading(true);

            const activeToken = token || localStorage.getItem("token");
            const activeRole = role || user?.role;

            const endpoint =
                activeRole === "STAFF" || activeRole === "ADMIN"
                    ? "http://localhost:5000/api/orders"
                    : "http://localhost:5000/api/orders/my-orders";

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
                return;
            }

            if (response.status === 403) {
                setError("You do not have permission to view these orders.");
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch orders");
            }

            setOrders(data.orders || []);
            if (isManualRefresh) {
                showToast("Orders list refreshed!", "success");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            setUpdatingId(orderId);
            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/orders/${orderId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update order");
            }

            setOrders((currentOrders) =>
                currentOrders.map((order) =>
                    order.id === orderId
                        ? { ...order, status: newStatus }
                        : order
                )
            );

            if (newStatus === "PREPARING") {
                showToast(`Order #${orderId} moved to Preparing! 👨‍🍳`, "success");
            } else if (newStatus === "COMPLETED") {
                showToast(`Order #${orderId} marked as Completed! 🎉`, "success");
            } else {
                showToast(`Order #${orderId} updated to ${newStatus}`, "success");
            }
        } catch (err) {
            console.error(err);
            showToast(err.message || `Failed to update Order #${orderId}`, "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const isStaffOrAdmin =
        user?.role === "STAFF" ||
        user?.role === "ADMIN";

    // Summary Metrics
    const stats = useMemo(() => {
        const total = orders.length;
        const pending = orders.filter((o) => o.status === "PENDING").length;
        const preparing = orders.filter((o) => o.status === "PREPARING").length;
        const completed = orders.filter((o) => o.status === "COMPLETED").length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        return { total, pending, preparing, completed, totalRevenue };
    }, [orders]);

    // Filter and Sort Orders
    const filteredOrders = useMemo(() => {
        return orders
            .filter((order) => {
                // Status Tab Filter
                if (statusFilter !== "ALL" && order.status !== statusFilter) {
                    return false;
                }

                // Search Query Filter (Order ID, Item Name, Customer Name/Email)
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase().trim();
                    const matchesId = String(order.id).includes(query);
                    const matchesCustomer =
                        order.user_name?.toLowerCase().includes(query) ||
                        order.user_email?.toLowerCase().includes(query);
                    const matchesItems = order.items?.some((item) =>
                        (item.product_name || item.name || "")
                            .toLowerCase()
                            .includes(query)
                    );
                    return matchesId || matchesCustomer || matchesItems;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === "NEWEST") {
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
                if (sortBy === "OLDEST") {
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                }
                if (sortBy === "PRICE_HIGH") {
                    return Number(b.total_amount || 0) - Number(a.total_amount || 0);
                }
                if (sortBy === "PRICE_LOW") {
                    return Number(a.total_amount || 0) - Number(b.total_amount || 0);
                }
                return 0;
            });
    }, [orders, statusFilter, searchQuery, sortBy]);

    const printOrderReceipt = (order) => {
        if (!order) return;

        const formattedDate = formatToIST(order.created_at);
        const itemsHtml = (order.items || [])
            .map((item) => {
                const name = item.product_name || item.name || "Item";
                const qty = item.quantity || 1;
                const price = Number(item.price || 0).toFixed(0);
                const total = Number((item.price || 0) * qty).toFixed(2);
                return `
                    <tr>
                        <td style="padding: 4px 0; font-weight: 600; text-align: left; max-width: 140px; word-break: break-word;">${name}</td>
                        <td style="padding: 4px 0; text-align: center; font-family: monospace; color: #444;">${qty} &times; &#8377;${price}</td>
                        <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 700;">&#8377;${total}</td>
                    </tr>
                `;
            })
            .join("");

        const subtotal = (order.items || []).reduce((acc, curr) => acc + Number(curr.price || 0) * (curr.quantity || 1), 0);
        const breakdown = calculateBillBreakdown(subtotal, billSettings);
        const grandTotal = Number(order.total_amount || breakdown.grand_total).toFixed(2);
        const totalQty = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);

        const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt_Order_${order.id}</title>
    <meta charset="utf-8" />
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        @media print {
            html, body {
                width: 80mm;
                margin: 0 auto;
                padding: 6mm 4mm;
                background: #fff;
                color: #000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 12px;
                line-height: 1.35;
            }
        }
        body {
            width: 76mm;
            margin: 0 auto;
            padding: 10px 4px;
            background: #fff;
            color: #111;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.35;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .header-icon {
            width: 36px;
            height: 36px;
            line-height: 36px;
            background: #ea580c;
            color: #fff;
            border-radius: 8px;
            margin: 0 auto 6px auto;
            font-size: 18px;
            text-align: center;
        }
        .title {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 0;
            color: #111;
        }
        .subtitle {
            font-size: 10px;
            color: #555;
            margin: 2px 0 0 0;
        }
        .divider {
            border-top: 1px dashed #777;
            margin: 8px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 11px;
        }
        .info-label { color: #555; font-weight: 500; }
        .info-value { color: #111; font-weight: 700; }
        .token-value { font-size: 14px; font-weight: 900; color: #000; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 4px;
        }
        th {
            border-bottom: 1px dashed #777;
            padding: 4px 0;
            color: #444;
            font-size: 10px;
            text-transform: uppercase;
        }
        .grand-total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #444;
            font-size: 14px;
            font-weight: 900;
            color: #000;
        }
        .grand-total-price {
            font-size: 16px;
            color: #000;
        }
        .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
            color: #555;
            line-height: 1.4;
        }
        .footer-bold {
            font-weight: 700;
            color: #111;
            font-size: 11px;
            margin-bottom: 2px;
        }
    </style>
</head>
<body>
    <div class="text-center">
        <div class="header-icon">&#9749;</div>
        <h1 class="title">CAFE EXPERIENCE</h1>
        <p class="subtitle">Fresh Chai, Coffee &amp; Delicious Bites</p>
    </div>

    <div class="divider"></div>

    <div class="info-row">
        <span class="info-label">Order Token:</span>
        <span class="token-value">#${order.id}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Date &amp; Time:</span>
        <span class="info-value">${formattedDate}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${order.status}</span>
    </div>
    ${
        order.user_name
            ? `
    <div class="info-row">
        <span class="info-label">Customer:</span>
        <span class="info-value">${order.user_name}</span>
    </div>
    `
            : ""
    }

    <div class="divider"></div>

    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty &times; Rate</th>
                <th style="text-align: right;">Amt</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="divider"></div>

    <div class="info-row">
        <span class="info-label">Total Items:</span>
        <span class="info-value">${totalQty}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Subtotal (Food &amp; Snacks):</span>
        <span class="info-value">&#8377;${breakdown.subtotal.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Packaging Fee (${breakdown.packaging_fee_percent}%):</span>
        <span class="info-value">&#8377;${breakdown.packaging_fee.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Platform Fee (App fee):</span>
        <span class="info-value">&#8377;${breakdown.platform_fee.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">CGST (${breakdown.cgst_percent}%):</span>
        <span class="info-value">&#8377;${breakdown.cgst.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">SGST (${breakdown.sgst_percent}%):</span>
        <span class="info-value">&#8377;${breakdown.sgst.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">GST on Platform Fee (${breakdown.platform_fee_gst_percent}%):</span>
        <span class="info-value">&#8377;${breakdown.platform_fee_gst.toFixed(2)}</span>
    </div>
    <div class="info-row" style="font-weight: 700;">
        <span class="info-label">Calculated Total:</span>
        <span class="info-value">&#8377;${breakdown.calculated_total.toFixed(2)}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Rounding Off (Ceil):</span>
        <span class="info-value">${breakdown.rounding_off >= 0 ? `+&#8377;${breakdown.rounding_off.toFixed(2)}` : `-&#8377;${Math.abs(breakdown.rounding_off).toFixed(2)}`}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Payment Mode:</span>
        <span class="info-value">Direct / Paid</span>
    </div>
    <div class="grand-total-row">
        <span>Grand Total:</span>
        <span class="grand-total-price">&#8377;${breakdown.grand_total.toFixed(2)}</span>
    </div>
    </div>

    <div class="divider"></div>

    <div class="footer">
        <div class="footer-bold">Thank you for dining with us! &#9749;</div>
        <div>Please visit again soon!</div>
    </div>
</body>
</html>`;

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.setAttribute("title", "Print Receipt");

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(receiptHtml);
        doc.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 250);
    };

    const handlePrintReceipt = (order) => {
        if (!isStaffOrAdmin) return;
        setReceiptOrder(order);
    };

    const triggerSystemPrint = () => {
        if (receiptOrder) {
            printOrderReceipt(receiptOrder);
        }
    };

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    position="top-20 right-6"
                    onClose={() => setToast(null)}
                />
            )}

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Top Header Banner */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                                {isStaffOrAdmin ? "Orders Management" : "My Orders"}
                            </h1>
                            {isStaffOrAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100/80 px-2.5 py-0.5 text-xs font-bold text-orange-800 shadow-2xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-ping" />
                                    Staff/Admin Console
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
                                    ☕ Customer History
                                </span>
                            )}
                        </div>
                        <p className="mt-1.5 text-sm text-stone-600">
                            {isStaffOrAdmin
                                ? "Real-time kitchen display and customer order dispatch system"
                                : "Track your delicious orders, preparation progress, and receipts"}
                        </p>
                    </div>

                    {/* Quick Action / Refresh */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchOrders(null, null, true)}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-xs transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-600 active:scale-95 disabled:opacity-50"
                            title="Refresh orders"
                        >
                            <svg
                                className={`h-4 w-4 text-stone-500 ${refreshing ? "animate-spin text-orange-600" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                        </button>

                        {!isStaffOrAdmin && (
                            <Link
                                href="/items"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:bg-orange-700 active:scale-95"
                            >
                                <span>+ New Order</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Dashboard Stats Overview Cards */}
                <div className={`mb-8 ${isStaffOrAdmin ? "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4" : "max-w-xs"}`}>
                    {/* Total Orders Card */}
                    <div
                        onClick={() => setStatusFilter("ALL")}
                        className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 shadow-xs backdrop-blur-sm transition-all hover:shadow-md ${statusFilter === "ALL"
                                ? "border-stone-400 bg-stone-100/90 ring-2 ring-stone-400/40"
                                : "border-stone-200/80 bg-white/90 hover:border-stone-300"
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wide uppercase text-stone-600">
                                Total Orders
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                                📋
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900 sm:text-3xl">
                                {stats.total}
                            </span>
                            <span className="text-xs font-medium text-stone-400">placed</span>
                        </div>
                    </div>

                    {/* Admin/Staff Only Metrics (Pending, In Kitchen, Completed) */}
                    {isStaffOrAdmin && (
                        <>
                            {/* Pending Orders Card */}
                            <div
                                onClick={() => setStatusFilter(statusFilter === "PENDING" ? "ALL" : "PENDING")}
                                className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 shadow-xs backdrop-blur-sm transition-all hover:shadow-md ${statusFilter === "PENDING"
                                        ? "border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/40"
                                        : "border-amber-200/80 bg-amber-50/50 hover:border-amber-300"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold tracking-wide uppercase text-amber-800">
                                        Pending
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                        ⏳
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-amber-900 sm:text-3xl">
                                        {stats.pending}
                                    </span>
                                    {stats.pending > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            Needs action
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Preparing Orders Card */}
                            <div
                                onClick={() => setStatusFilter(statusFilter === "PREPARING" ? "ALL" : "PREPARING")}
                                className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 shadow-xs backdrop-blur-sm transition-all hover:shadow-md ${statusFilter === "PREPARING"
                                        ? "border-blue-400 bg-blue-50/90 ring-2 ring-blue-400/40"
                                        : "border-blue-200/80 bg-blue-50/50 hover:border-blue-300"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold tracking-wide uppercase text-blue-800">
                                        In Kitchen
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                        👨‍🍳
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-blue-900 sm:text-3xl">
                                        {stats.preparing}
                                    </span>
                                    <span className="text-xs font-medium text-blue-600">preparing</span>
                                </div>
                            </div>

                            {/* Completed Card */}
                            <div
                                onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
                                className={`cursor-pointer relative overflow-hidden rounded-2xl border p-4 shadow-xs backdrop-blur-sm transition-all hover:shadow-md ${statusFilter === "COMPLETED"
                                        ? "border-emerald-400 bg-emerald-50/90 ring-2 ring-emerald-400/40"
                                        : "border-emerald-200/80 bg-emerald-50/50 hover:border-emerald-300"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold tracking-wide uppercase text-emerald-800">
                                        Completed
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                        ✅
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-emerald-900 sm:text-3xl">
                                        {stats.completed}
                                    </span>
                                    <span className="text-xs font-medium text-emerald-600">ready</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Filter Tabs & Search / Sort Toolbar */}
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 p-3.5 shadow-xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setStatusFilter("ALL")}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${statusFilter === "ALL"
                                    ? "bg-gray-900 text-white shadow-xs"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                        >
                            <span>All</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === "ALL" ? "bg-stone-700 text-white" : "bg-stone-200 text-stone-700"}`}>
                                {stats.total}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter("PENDING")}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${statusFilter === "PENDING"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100"
                                }`}
                        >
                            <span>Pending</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === "PENDING" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"}`}>
                                {stats.pending}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter("PREPARING")}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${statusFilter === "PREPARING"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-blue-50 text-blue-800 border border-blue-200/60 hover:bg-blue-100"
                                }`}
                        >
                            <span>Preparing</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === "PREPARING" ? "bg-blue-800 text-white" : "bg-blue-200 text-blue-900"}`}>
                                {stats.preparing}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter("COMPLETED")}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${statusFilter === "COMPLETED"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100"
                                }`}
                        >
                            <span>Completed</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === "COMPLETED" ? "bg-emerald-800 text-white" : "bg-emerald-200 text-emerald-900"}`}>
                                {stats.completed}
                            </span>
                        </button>
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg
                                    className="h-3.5 w-3.5 text-stone-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isStaffOrAdmin ? "Search order #, customer, item..." : "Search by order # or item..."}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-1.5 pr-8 pl-8 text-xs font-medium text-stone-800 placeholder-stone-400 transition-all focus:border-orange-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-600"
                                >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-1">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="cursor-pointer rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-all focus:border-orange-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-200"
                            >
                                <option value="NEWEST">Newest First</option>
                                <option value="OLDEST">Oldest First</option>
                                <option value="PRICE_HIGH">Highest Amount</option>
                                <option value="PRICE_LOW">Lowest Amount</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white/70 p-6 shadow-xs animate-pulse"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-stone-200" />
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-24 rounded bg-stone-200" />
                                                <div className="h-3 w-16 rounded bg-stone-100" />
                                            </div>
                                        </div>
                                        <div className="h-6 w-20 rounded-full bg-stone-200" />
                                    </div>
                                    <div className="mt-4 h-2 w-full rounded bg-stone-100" />
                                    <div className="mt-4 space-y-2 rounded-2xl bg-stone-50 p-4">
                                        <div className="h-3.5 w-full rounded bg-stone-200" />
                                        <div className="h-3.5 w-4/5 rounded bg-stone-200" />
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-stone-100 pt-4">
                                    <div className="h-6 w-28 rounded bg-stone-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error Banner */}
                {!loading && error && (
                    <div className="rounded-3xl border border-red-200 bg-red-50/90 p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                            ⚠️
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-red-900">Failed to Load Orders</h3>
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                        <button
                            onClick={() => fetchOrders(null, null)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredOrders.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-stone-300/80 bg-white/70 p-12 text-center shadow-xs backdrop-blur-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-2xl shadow-inner">
                            🍵
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-gray-900">
                            {searchQuery || statusFilter !== "ALL"
                                ? "No matching orders found"
                                : isStaffOrAdmin
                                    ? "No active orders in the queue"
                                    : "You haven't placed any orders yet"}
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-sm text-sm text-stone-500">
                            {searchQuery || statusFilter !== "ALL"
                                ? "Try resetting your search query or switching the status filter tab."
                                : isStaffOrAdmin
                                    ? "Incoming customer orders will appear here automatically."
                                    : "Treat yourself with our authentic freshly brewed teas, coffees, and delicious snacks!"}
                        </p>

                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {searchQuery || statusFilter !== "ALL" ? (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("ALL");
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-xs transition hover:bg-stone-50"
                                >
                                    Reset Filters
                                </button>
                            ) : !isStaffOrAdmin ? (
                                <Link
                                    href="/items"
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-700 hover:shadow-lg"
                                >
                                    <span>Explore Menu</span>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Orders Cards Grid */}
                {!loading && !error && filteredOrders.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredOrders.map((order) => {
                            const totalItemCount =
                                order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ||
                                order.items?.length ||
                                0;

                            return (
                                <div
                                    key={order.id}
                                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-5 sm:p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/80 hover:shadow-xl hover:shadow-orange-950/8"
                                >
                                    {/* Top Glow Accent */}
                                    <div
                                        className={`absolute top-0 left-0 right-0 h-1.5 ${order.status === "PENDING"
                                                ? "bg-gradient-to-r from-amber-400 to-orange-400"
                                                : order.status === "PREPARING"
                                                    ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                                                    : "bg-gradient-to-r from-emerald-400 to-teal-500"
                                            }`}
                                    />

                                    <div>
                                        {/* Card Header: Token # & Status */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-50 font-black text-sm text-orange-600 shadow-2xs">
                                                    #{order.id}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-base font-extrabold text-gray-900">
                                                            Order #{order.id}
                                                        </h2>
                                                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
                                                            {getRelativeTime(order.created_at)}
                                                        </span>
                                                    </div>
                                                    {order.created_at && (
                                                        <p className="text-[11px] font-medium text-stone-400">
                                                            {formatToIST(order.created_at)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>

                                        {/* Order Progress Stepper */}
                                        <OrderProgressBar status={order.status} />

                                        {/* Customer info — STAFF / ADMIN only */}
                                        {isStaffOrAdmin && (
                                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50/90 p-3 shadow-2xs">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100/70 font-bold text-xs text-orange-700">
                                                    {order.user_name ? order.user_name.charAt(0).toUpperCase() : "C"}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="truncate text-xs font-bold text-gray-900">
                                                            {order.user_name || "Guest Customer"}
                                                        </p>
                                                        <span className="text-[10px] font-semibold text-stone-400">
                                                            Customer
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-[11px] text-stone-500">
                                                        {order.user_email}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Itemized Order List */}
                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400">
                                                    Items Ordered
                                                </span>
                                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                                    {totalItemCount} {totalItemCount === 1 ? "unit" : "units"}
                                                </span>
                                            </div>

                                            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-stone-100/90 bg-stone-50/70 p-3 scrollbar-thin">
                                                {order.items?.map((item, idx) => {
                                                    const itemName = item.product_name || item.name || "Item";
                                                    return (
                                                        <div
                                                            key={item.id || idx}
                                                            className="flex items-center justify-between gap-2 py-1 text-xs text-stone-700 border-b border-stone-100/50 last:border-0"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="flex h-5 min-w-[22px] items-center justify-center rounded-md border border-orange-200/80 bg-white px-1 text-[11px] font-black text-orange-600 shadow-2xs">
                                                                    {item.quantity}×
                                                                </span>
                                                                <span className="truncate font-semibold text-stone-800">
                                                                    {itemName}
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 font-bold text-gray-900">
                                                                ₹{Number(item.price * (item.quantity || 1)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer: Total Amount & Action Controls */}
                                    <div className="mt-5 border-t border-stone-100 pt-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                    Total Bill
                                                </span>
                                                <span className="text-2xl font-black tracking-tight text-gray-900">
                                                    ₹{Number(order.total_amount).toFixed(2)}
                                                </span>
                                            </div>

                                            {isStaffOrAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePrintReceipt(order)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-2xs transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                                                >
                                                    <svg
                                                        className="h-3.5 w-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                                        />
                                                    </svg>
                                                    <span>Receipt</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions — STAFF / ADMIN only */}
                                        {isStaffOrAdmin && (
                                            <div className="mt-4 space-y-2">
                                                {order.status === "PENDING" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "PREPARING")}
                                                        disabled={updatingId === order.id}
                                                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-orange-700 hover:to-amber-700 hover:shadow-md hover:shadow-orange-500/30 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {updatingId === order.id ? (
                                                            <span className="flex items-center gap-2">
                                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                </svg>
                                                                Updating...
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span>👨‍🍳 Accept & Start Preparing</span>
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                                </svg>
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {order.status === "PREPARING" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "COMPLETED")}
                                                        disabled={updatingId === order.id}
                                                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {updatingId === order.id ? (
                                                            <span className="flex items-center gap-2">
                                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                </svg>
                                                                Updating...
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span>✅ Mark as Ready / Completed</span>
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {order.status === "COMPLETED" && (
                                                    <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 py-2 text-xs font-bold text-emerald-800">
                                                        <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>Order Fulfilled</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Thermal / Printable Receipt Modal */}
            {isStaffOrAdmin && receiptOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-sm flex flex-col rounded-3xl bg-white shadow-2xl transition-all" style={{maxHeight: "90vh"}}>
                        {/* Receipt Header Actions */}
                        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-3 rounded-t-3xl">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                Cafe Bill Receipt
                            </span>
                            <button
                                onClick={() => setReceiptOrder(null)}
                                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Printable Thermal Receipt Card — scrollable */}
                        <div id="cafe-printable-receipt" className="overflow-y-auto flex-1 p-6 text-stone-800">
                            <div className="text-center">
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white font-black text-lg shadow-sm">
                                    ☕
                                </div>
                                <h3 className="mt-2 text-base font-black tracking-tight text-gray-900">
                                    CAFE EXPERIENCE
                                </h3>
                                <p className="text-[11px] text-stone-500">
                                    Fresh Chai, Coffee & Delicious Bites
                                </p>
                            </div>

                            <div className="my-3 border-t border-dashed border-stone-300" />

                            <div className="space-y-1 text-xs text-stone-600">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Order Token:</span>
                                    <span className="font-extrabold text-stone-900">#{receiptOrder.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Date & Time:</span>
                                    <span className="font-medium text-stone-900">{formatToIST(receiptOrder.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="font-bold text-stone-900">{receiptOrder.status}</span>
                                </div>
                                {receiptOrder.user_name && (
                                    <div className="flex justify-between">
                                        <span>Customer:</span>
                                        <span className="font-semibold text-stone-900">{receiptOrder.user_name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="my-3 border-t border-dashed border-stone-300" />

                            {/* Items Table */}
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between font-bold text-stone-500 uppercase text-[10px]">
                                    <span>Item</span>
                                    <span>Qty × Rate</span>
                                    <span>Amt</span>
                                </div>
                                {receiptOrder.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-stone-800">
                                        <span className="truncate max-w-[130px] font-medium">
                                            {item.product_name || item.name}
                                        </span>
                                        <span className="text-stone-500 font-mono">
                                            {item.quantity} × ₹{Number(item.price).toFixed(0)}
                                        </span>
                                        <span className="font-bold font-mono">
                                            ₹{Number(item.price * (item.quantity || 1)).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="my-3 border-t border-dashed border-stone-300" />

                            {/* Detailed Bill Breakdown */}
                            {(() => {
                                const receiptSubtotal = (receiptOrder.items || []).reduce(
                                    (acc, curr) => acc + Number(curr.price || 0) * (curr.quantity || 1),
                                    0
                                );
                                const b = calculateBillBreakdown(receiptSubtotal, billSettings);
                                return (
                                    <div className="space-y-1.5 text-xs text-stone-600">
                                        <div className="flex justify-between">
                                            <span>Subtotal <span className="text-[10px] text-stone-400 font-normal">(Food &amp; Snacks)</span></span>
                                            <span className="font-semibold text-stone-900 font-mono">₹{b.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Packaging Fee <span className="rounded-sm bg-stone-100 px-1 py-0.2 text-[9px] font-bold text-stone-600">{b.packaging_fee_percent}%</span></span>
                                            <span className="font-semibold text-stone-800 font-mono">₹{b.packaging_fee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Platform Fee <span className="text-[10px] text-stone-400 font-normal">(App fee)</span></span>
                                            <span className="font-semibold text-stone-800 font-mono">₹{b.platform_fee.toFixed(2)}</span>
                                        </div>

                                        {/* Taxes Sub-card */}
                                        <div className="my-1.5 rounded-xl bg-stone-50/80 p-2 space-y-1 text-[11px] border border-stone-200/60">
                                            <div className="flex justify-between text-stone-600">
                                                <span>CGST ({b.cgst_percent}%)</span>
                                                <span className="font-mono font-medium text-stone-800">₹{b.cgst.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-stone-600">
                                                <span>SGST ({b.sgst_percent}%)</span>
                                                <span className="font-mono font-medium text-stone-800">₹{b.sgst.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-stone-600">
                                                <span>GST on Platform Fee ({b.platform_fee_gst_percent}%)</span>
                                                <span className="font-mono font-medium text-stone-800">₹{b.platform_fee_gst.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between text-stone-700 font-medium">
                                            <span>Calculated Total</span>
                                            <span className="font-mono font-bold text-stone-800">₹{b.calculated_total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-stone-500 text-[11px]">
                                            <span>Rounding Off (Ceil)</span>
                                            <span className="font-mono font-semibold text-stone-700">
                                                {b.rounding_off >= 0 ? `+₹${b.rounding_off.toFixed(2)}` : `-₹${Math.abs(b.rounding_off).toFixed(2)}`}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-100 text-[11px]">
                                            <span>Payment Method</span>
                                            <span className="font-semibold text-stone-800">Direct / Paid</span>
                                        </div>

                                        <div className="flex items-baseline justify-between pt-1.5 text-sm font-black text-gray-900 border-t border-dashed border-stone-300">
                                            <span className="text-stone-900">Grand Total:</span>
                                            <span className="text-lg text-orange-600 font-mono">₹{b.grand_total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="my-4 border-t border-dashed border-stone-300" />

                            <div className="text-center">
                                <p className="text-[11px] font-semibold text-stone-600">
                                    Thank you for dining with us! ☕
                                </p>
                                <p className="text-[10px] text-stone-400 mt-0.5">
                                    Please visit again soon!
                                </p>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex shrink-0 gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3.5 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={() => setReceiptOrder(null)}
                                className="flex-1 rounded-xl border border-stone-300 bg-white py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={triggerSystemPrint}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-700 active:scale-95"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span>Print Bill</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Quick Action Button: New Order on downmost rightmost side */}
            <div className="fixed bottom-6 right-6 z-40">
                <Link
                    href="/items"
                    className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-500/40 active:scale-95"
                    title="Place New Order"
                >
                    <span>+ New Order</span>
                </Link>
            </div>
        </div>
    );
}