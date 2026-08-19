"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

function StatusBadge({ status }) {
    if (status === "PENDING") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-bold tracking-wide text-amber-800 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                PENDING
            </span>
        );
    }
    if (status === "PREPARING") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-800 shadow-xs">
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wide text-emerald-800 shadow-xs">
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

export default function OrdersPage() {

    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

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

    }, []);


    const fetchOrders = async (token, role) => {
        try {
            // USER → own orders
            // STAFF / ADMIN → all orders
            const endpoint =
                role === "STAFF" || role === "ADMIN"
                    ? "http://localhost:5000/api/orders"
                    : "http://localhost:5000/api/orders/my-orders";

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
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

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
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
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
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

        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setUpdatingId(null);
        }
    };


    const isStaffOrAdmin =
        user?.role === "STAFF" ||
        user?.role === "ADMIN";


    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="mx-auto max-w-7xl px-6 py-10">
                    <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                    <p className="mt-4 text-gray-600">Loading orders...</p>
                </main>
            </div>
        );
    }


    if (error) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="mx-auto max-w-7xl px-6 py-10">
                    <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                    <div className="mt-6 rounded-2xl border bg-white p-6 text-center shadow-sm">
                        <p className="text-red-600">{error}</p>
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div className="min-h-screen">

            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-10">

                {/* Page header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isStaffOrAdmin ? "All Orders" : "My Orders"}
                    </h1>
                    <p className="mt-2 text-gray-600">
                        {isStaffOrAdmin
                            ? "Manage and track customer orders"
                            : "View your order history and status"}
                    </p>
                </div>


                {orders.length === 0 ? (

                    <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
                        <p className="text-gray-600">
                            {isStaffOrAdmin
                                ? "No orders found."
                                : "You haven't placed any orders yet."}
                        </p>
                    </div>

                ) : (

                    <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">

                        {orders.map((order) => (

                            <div
                                key={order.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/80 hover:shadow-xl hover:shadow-orange-950/5"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200/70 bg-orange-50 font-extrabold text-sm text-orange-600 shadow-2xs">
                                                #{order.id}
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900">
                                                    Order #{order.id}
                                                </h2>
                                                {order.created_at && (
                                                    <p className="text-[11px] font-medium text-stone-400">
                                                        {formatToIST(order.created_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>


                                    {/* Customer info — STAFF / ADMIN only */}
                                    {isStaffOrAdmin && (
                                        <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                Customer
                                            </p>
                                            <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                                {order.user_name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {order.user_email}
                                            </p>
                                        </div>
                                    )}


                                    {/* Items Container */}
                                    <div className="mt-4">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                            Items ({order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || order.items?.length || 0})
                                        </p>

                                        <div className="space-y-2 rounded-xl border border-stone-100/90 bg-stone-50/60 p-3.5">
                                            {order.items?.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between text-sm text-stone-700"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-stone-200/80 bg-white px-1 text-[11px] font-bold text-orange-600 shadow-2xs">
                                                            {item.quantity}×
                                                        </span>
                                                        <span className="font-medium text-stone-800">
                                                            {item.product_name || item.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-gray-900">
                                                        ₹{Number(item.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                                <div>
                                    {/* Total */}
                                    <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                                        <div>
                                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                                Total Amount
                                            </span>
                                            <span className="text-2xl font-extrabold text-gray-900">
                                                ₹{Number(order.total_amount).toFixed(2)}
                                            </span>
                                        </div>

                                        {!isStaffOrAdmin && (
                                            <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                                                {order.items?.length} {order.items?.length === 1 ? "item" : "items"}
                                            </span>
                                        )}
                                    </div>


                                    {/* Actions — STAFF / ADMIN only */}
                                    {isStaffOrAdmin && (
                                        <div className="mt-4">

                                            {order.status === "PENDING" && (
                                                <button
                                                    onClick={() => updateStatus(order.id, "PREPARING")}
                                                    disabled={updatingId === order.id}
                                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-md hover:shadow-orange-500/30 active:translate-y-0 active:scale-95 disabled:opacity-50"
                                                >
                                                    {updatingId === order.id ? (
                                                        "Updating..."
                                                    ) : (
                                                        <>
                                                            <span>Accept Order</span>
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
                                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/30 active:translate-y-0 active:scale-95 disabled:opacity-50"
                                                >
                                                    {updatingId === order.id ? (
                                                        "Updating..."
                                                    ) : (
                                                        <>
                                                            <span>Mark as Completed</span>
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {order.status === "COMPLETED" && (
                                                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-5 py-2.5 text-sm font-bold text-emerald-700">
                                                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>Order Completed</span>
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </main>

        </div>
    );
}