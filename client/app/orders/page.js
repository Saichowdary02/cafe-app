"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const STATUS_STYLES = {
    PENDING: "bg-orange-100 text-orange-700",
    PREPARING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
};

function StatusBadge({ status }) {
    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_STYLES[status] || "bg-gray-100 text-gray-700"
            }`}
        >
            {status}
        </span>
    );
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
            <div className="min-h-screen bg-gray-50">
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
            <div className="min-h-screen bg-gray-50">
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
        <div className="min-h-screen bg-gray-50">

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

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

                        {orders.map((order) => (

                            <div
                                key={order.id}
                                className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm"
                            >

                                {/* Card header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Order #{order.id}
                                    </h2>
                                    <StatusBadge status={order.status} />
                                </div>


                                {/* Customer info — STAFF / ADMIN only */}
                                {isStaffOrAdmin && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Customer
                                        </p>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {order.user_name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {order.user_email}
                                        </p>
                                    </div>
                                )}


                                <hr className="my-4 border-gray-100" />


                                {/* Items */}
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Items
                                    </p>

                                    <div className="mt-2 space-y-1.5">
                                        {order.items?.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex justify-between text-sm text-gray-700"
                                            >
                                                <span>
                                                    {item.product_name || item.name}
                                                    <span className="text-gray-400"> × {item.quantity}</span>
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    ₹{item.price}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>


                                <hr className="my-4 border-gray-100" />


                                {/* Total */}
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-900">Total</span>
                                    <span className="font-bold text-gray-900">
                                        ₹{order.total_amount}
                                    </span>
                                </div>


                                {/* Actions — STAFF / ADMIN only */}
                                {isStaffOrAdmin && (
                                    <div className="mt-5">

                                        {order.status === "PENDING" && (
                                            <button
                                                onClick={() => updateStatus(order.id, "PREPARING")}
                                                disabled={updatingId === order.id}
                                                className="w-full rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                {updatingId === order.id ? "Updating..." : "Accept Order"}
                                            </button>
                                        )}

                                        {order.status === "PREPARING" && (
                                            <button
                                                onClick={() => updateStatus(order.id, "COMPLETED")}
                                                disabled={updatingId === order.id}
                                                className="w-full rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                {updatingId === order.id ? "Updating..." : "Mark as Completed"}
                                            </button>
                                        )}

                                        {order.status === "COMPLETED" && (
                                            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700">
                                                ✓ Order Completed
                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>

                        ))}

                    </div>

                )}

            </main>

        </div>
    );
}