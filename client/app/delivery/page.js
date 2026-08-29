"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";

// Leaflet requires browser APIs — no SSR
const DeliveryRouteMap = dynamic(
    () => import("@/components/maps/DeliveryRouteMap"),
    { ssr: false }
);
const LiveLocationSender = dynamic(
    () => import("@/components/maps/LiveLocationSender"),
    { ssr: false }
);

import { ORDER_STATUS_CONFIG } from "@/lib/orderStatus";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STATUS_STYLES = Object.fromEntries(
    Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => {
        // Derive tailwind badge classes from the shared config colors
        const colorMap = {
            ORDER_PLACED: {
                badge: "bg-amber-50 text-amber-800 border-amber-300",
                dot: "bg-amber-500",
                accent: "bg-amber-400",
            },
            CONFIRMED: {
                badge: "bg-lime-50 text-lime-800 border-lime-300",
                dot: "bg-lime-500",
                accent: "bg-lime-400",
            },
            PREPARING: {
                badge: "bg-blue-50 text-blue-800 border-blue-300",
                dot: "bg-blue-500",
                accent: "bg-blue-400",
            },
            READY_FOR_PICKUP: {
                badge: "bg-violet-50 text-violet-800 border-violet-300",
                dot: "bg-violet-500",
                accent: "bg-violet-400",
            },
            OUT_FOR_DELIVERY: {
                badge: "bg-orange-50 text-orange-800 border-orange-300",
                dot: "bg-orange-500",
                accent: "bg-orange-400",
            },
            DELIVERED: {
                badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
                dot: "bg-emerald-500",
                accent: "bg-emerald-400",
            },
        };
        return [
            value,
            colorMap[value] || {
                badge: "border-stone-200 bg-stone-50 text-stone-700",
                dot: "bg-stone-400",
                accent: "bg-stone-300",
            },
        ];
    })
);

export default function DeliveryPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null); // order with open route map
    const [updatingId, setUpdatingId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => setToast({ message, type });
    const getToken = () => localStorage.getItem("token");

    // Guard: delivery-only page
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (!userData) {
            router.push("/login");
            return;
        }
        const parsed = JSON.parse(userData);
        if (parsed.role !== "DELIVERY") {
            router.push("/home");
            return;
        }
        setUser(parsed);
    }, [router]);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/delivery/orders`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error("Failed to fetch deliveries");
            const data = await res.json();
            setOrders(data.orders || []);
        } catch {
            showToast("Failed to load deliveries", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchOrders();
    }, [user, fetchOrders]);

    const updateStatus = async (order, status) => {
        setUpdatingId(order.id);
        try {
            const res = await fetch(
                `${API_URL}/api/delivery/orders/${order.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ status })
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Update failed");
            showToast(data.message, "success");
            fetchOrders();
        } catch (err) {
            showToast(err.message || "Failed to update status", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    // Delivery boy collects cash for his assigned cash-on-delivery order
    const markCashReceived = async (order) => {
        setUpdatingId(order.id);
        try {
            const res = await fetch(
                `${API_URL}/api/delivery/orders/${order.id}/payment-status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ payment_status: "PAID" })
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update payment");
            showToast(`Cash collected for Order #${order.id} 💵`, "success");
            fetchOrders();
        } catch (err) {
            showToast(err.message || "Failed to update payment", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                {/* Live GPS sharing — active while at least one order is out for delivery */}
                <LiveLocationSender
                    active={orders.some((o) => o.status === "OUT_FOR_DELIVERY")}
                />

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl shadow-md shadow-orange-200">
                            🛵
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                                My Deliveries
                            </h1>
                            <p className="mt-1 text-sm font-medium text-stone-500">
                                Orders assigned to you, with the customer&apos;s delivery
                                location.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-700">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                            </span>
                            {orders.filter((o) => o.status !== "DELIVERED").length} Active
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {orders.filter((o) => o.status === "DELIVERED").length} Delivered
                        </div>
                        <button
                        onClick={async () => {
                            setRefreshing(true);
                            await fetchOrders();
                            setRefreshing(false);
                            showToast("Deliveries refreshed", "success");
                        }}
                        disabled={refreshing || loading}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-xs transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:opacity-60 sm:self-auto"
                    >
                        <svg
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                            >
                                <div className="flex items-center justify-between border-b border-stone-100 p-5">
                                    <div className="space-y-2">
                                        <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
                                        <div className="h-3 w-44 animate-pulse rounded bg-stone-100" />
                                    </div>
                                    <div className="h-6 w-32 animate-pulse rounded-full bg-stone-100" />
                                </div>
                                <div className="grid gap-5 p-5 lg:grid-cols-2">
                                    <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
                                    <div className="hidden h-40 animate-pulse rounded-xl bg-stone-100 lg:block" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
                            🛵
                        </div>
                        <h2 className="mt-5 text-xl font-bold text-gray-900">
                            No deliveries assigned yet
                        </h2>
                        <p className="mt-2 text-sm text-stone-500">
                            The admin will assign deliveries to you here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            const styles =
                                STATUS_STYLES[order.status] || STATUS_STYLES.ORDER_PLACED;
                            const isDelivered = order.status === "DELIVERED";
                            return (
                            <div
                                key={order.id}
                                className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                            >
                                <div className={`h-1 w-full ${styles.accent}`} />
                                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${
                                                isDelivered
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "bg-orange-50 text-orange-600"
                                            }`}
                                        >
                                            {isDelivered ? "✓" : "📦"}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-gray-900">
                                                Order #{order.id}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[9px] font-black uppercase text-stone-500">
                                                    {(order.customer_name || "U").charAt(0)}
                                                </span>
                                                {order.customer_name} · {order.customer_email}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${styles.badge}`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                                        {order.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <div className="border-t border-stone-100 bg-stone-50/50">
                                <div className="grid gap-5 p-5 lg:grid-cols-2">
                                    {/* Details */}
                                    <div>
                                        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm shadow-xs">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-sm text-orange-600">
                                                    📍
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wide text-stone-400">
                                                        Delivery Address
                                                    </p>
                                                    <p className="mt-1 leading-relaxed text-stone-600">
                                                        {order.delivery_address ||
                                                            "No address text provided (see map)"}
                                                    </p>
                                                    {order.latitude != null && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-medium text-stone-500">
                                                                Lat {Number(order.latitude).toFixed(5)}
                                                            </span>
                                                            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-medium text-stone-500">
                                                                Lng {Number(order.longitude).toFixed(5)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-stone-200 pt-3">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-sm font-bold text-white">
                                                    ₹{Number(order.total_amount).toFixed(2)}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                        order.payment_mode === "ONLINE"
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-teal-50 text-teal-700"
                                                    }`}
                                                >
                                                    {order.payment_mode === "ONLINE"
                                                        ? "💳 Paid Online"
                                                        : "💵 Cash"}
                                                </span>
                                                {order.payment_mode === "CASH" && (
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                                                            order.payment_status === "PAID"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : "bg-amber-100 text-amber-700"
                                                        }`}
                                                    >
                                                        {order.payment_status === "PAID"
                                                            ? "✓ Cash Collected"
                                                            : "Collect on Delivery"}
                                                    </span>
                                                )}
                                            </div>

                                            {(order.items || []).length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-xs font-black uppercase tracking-wide text-stone-400">
                                                        Items
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {(order.items || []).map((i, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700"
                                                            >
                                                                {i.product_name}
                                                                <span className="rounded bg-white px-1 text-[10px] font-black text-orange-600">
                                                                    ×{i.quantity}
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() =>
                                                    setActiveOrder(
                                                        activeOrder?.id === order.id ? null : order
                                                    )
                                                }
                                                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition active:scale-95 ${
                                                    activeOrder?.id === order.id
                                                        ? "bg-stone-700 text-white hover:bg-stone-800"
                                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                                }`}
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                </svg>
                                                {activeOrder?.id === order.id
                                                    ? "Hide Route"
                                                    : "View Route"}
                                            </button>
                                            {/* Step 1: Start Delivery (READY_FOR_PICKUP only) */}
                                            {order.status === "READY_FOR_PICKUP" && (
                                                <button
                                                    onClick={() =>
                                                        updateStatus(order, "OUT_FOR_DELIVERY")
                                                    }
                                                    disabled={updatingId === order.id}
                                                    className="cursor-pointer rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                                                >
                                                    {updatingId === order.id
                                                        ? "Updating..."
                                                        : "Start Delivery"}
                                                </button>
                                            )}
                                            {/* Step 2: replaces Start Delivery in the same spot once out for delivery */}
                                            {order.status === "OUT_FOR_DELIVERY" && (
                                                <button
                                                    onClick={() => updateStatus(order, "DELIVERED")}
                                                    disabled={updatingId === order.id}
                                                    className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                                                >
                                                    {updatingId === order.id
                                                        ? "Updating..."
                                                        : "Mark Delivered"}
                                                </button>
                                            )}
                                            {/* Step 3 (CASH only): after delivered, collect the cash — online orders end at Mark Delivered */}
                                            {order.payment_mode === "CASH" &&
                                                order.payment_status !== "PAID" &&
                                                order.status === "DELIVERED" && (
                                                <button
                                                    onClick={() => markCashReceived(order)}
                                                    disabled={updatingId === order.id}
                                                    className="cursor-pointer rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
                                                >
                                                    {updatingId === order.id
                                                        ? "Updating..."
                                                        : `💵 Collect ₹${Number(order.total_amount).toFixed(2)} Cash`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Route map (delivery boy GPS → customer) */}
                                    {activeOrder?.id === order.id && (
                                        <div>
                                            {order.latitude != null ? (
                                                <DeliveryRouteMap
                                                    destination={{
                                                        latitude: order.latitude,
                                                        longitude: order.longitude,
                                                        address: order.delivery_address
                                                    }}
                                                />
                                            ) : (
                                                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                                    This order has no delivery location.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                )}
            </main>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
