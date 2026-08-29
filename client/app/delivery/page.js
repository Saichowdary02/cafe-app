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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STATUS_STYLES = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-300",
    PREPARING: "bg-blue-50 text-blue-800 border-blue-300",
    READY_FOR_DELIVERY: "bg-violet-50 text-violet-800 border-violet-300",
    OUT_FOR_DELIVERY: "bg-orange-50 text-orange-800 border-orange-300",
    COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-300"
};

export default function DeliveryPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null); // order with open route map
    const [updatingId, setUpdatingId] = useState(null);
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

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
                        My Deliveries
                    </h1>
                    <p className="mt-2 text-sm font-medium text-stone-500">
                        Orders assigned to you, with the customer&apos;s delivery location.
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm font-medium text-stone-500">Loading deliveries...</p>
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
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
                                    <div>
                                        <p className="text-lg font-black text-gray-900">
                                            Order #{order.id}
                                        </p>
                                        <p className="mt-0.5 text-xs font-medium text-stone-500">
                                            {order.customer_name} · {order.customer_email}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                            STATUS_STYLES[order.status] ||
                                            "border-stone-200 bg-stone-50 text-stone-700"
                                        }`}
                                    >
                                        {order.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <div className="grid gap-5 p-5 lg:grid-cols-2">
                                    {/* Details */}
                                    <div>
                                        <div className="rounded-xl bg-stone-50 p-4 text-sm">
                                            <p className="font-bold text-gray-900">Delivery Address</p>
                                            <p className="mt-1 text-stone-600">
                                                {order.delivery_address ||
                                                    "No address text provided (see map)"}
                                            </p>
                                            {order.latitude != null && (
                                                <p className="mt-2 text-xs font-medium text-stone-500">
                                                    Lat: {Number(order.latitude).toFixed(6)} · Lng:{" "}
                                                    {Number(order.longitude).toFixed(6)}
                                                </p>
                                            )}
                                            <p className="mt-3 font-bold text-gray-900">
                                                Total: ₹{Number(order.total_amount).toFixed(2)}{" "}
                                                <span className="text-xs font-semibold text-stone-500">
                                                    ({order.payment_mode === "ONLINE" ? "Paid Online" : "Cash"})
                                                </span>
                                            </p>
                                            <p className="mt-2 text-xs font-semibold text-stone-600">
                                                Items:{" "}
                                                {(order.items || [])
                                                    .map((i) => `${i.product_name} ×${i.quantity}`)
                                                    .join(", ")}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() =>
                                                    setActiveOrder(
                                                        activeOrder?.id === order.id ? null : order
                                                    )
                                                }
                                                className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                                            >
                                                {activeOrder?.id === order.id
                                                    ? "Hide Route"
                                                    : "View Route"}
                                            </button>
                                            {(order.status === "PREPARING" ||
                                                order.status === "READY_FOR_DELIVERY") && (
                                                <button
                                                    onClick={() =>
                                                        updateStatus(order, "OUT_FOR_DELIVERY")
                                                    }
                                                    disabled={updatingId === order.id}
                                                    className="cursor-pointer rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                                                >
                                                    Start Delivery
                                                </button>
                                            )}
                                            {(order.status === "OUT_FOR_DELIVERY" ||
                                                order.status === "READY_FOR_DELIVERY") && (
                                                <button
                                                    onClick={() => updateStatus(order, "COMPLETED")}
                                                    disabled={updatingId === order.id}
                                                    className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                                                >
                                                    Mark Delivered
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
                        ))}
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
