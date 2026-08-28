"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderSuccessContent() {

    const searchParams = useSearchParams();

    const orderId = searchParams.get("orderId");

    const [order, setOrder] = useState(null);
    const [fetchFailed, setFetchFailed] = useState(false);

    useEffect(() => {

        const fetchOrder = async () => {

            try {

                const token = localStorage.getItem("token");

                const response = await fetch(
                    "http://localhost:5000/api/orders/my-orders",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (!response.ok) {
                    setFetchFailed(true);
                    return;
                }

                const data = await response.json();

                const matched = (data.orders || []).find(
                    (o) => String(o.id) === String(orderId)
                );

                if (matched) {
                    setOrder(matched);
                } else {
                    setFetchFailed(true);
                }

            } catch (error) {
                console.error(error);
                setFetchFailed(true);
            }
        };

        if (orderId) {
            fetchOrder();
        }

    }, [orderId]);

    const paymentMode = order?.payment_mode
        || (searchParams.get("paid") === "1" ? "ONLINE" : "CASH");

    const paymentStatus = order?.payment_status
        || (searchParams.get("paid") === "1" ? "PAID" : "PENDING");

    const isPaid = paymentStatus === "PAID";
    const isFailed = paymentStatus === "FAILED";

    const statusColor = isPaid
        ? "text-green-600"
        : isFailed
            ? "text-red-600"
            : "text-orange-600";

    const statusLabel = isFailed
        ? "FAILED"
        : isPaid
            ? `PAID (${paymentMode === "ONLINE" ? "Online" : "Cash"})`
            : `PENDING (${paymentMode === "ONLINE" ? "Online" : "Cash"})`;

    const helperText = paymentMode === "CASH" && !isPaid
        ? "Your cash payment is pending. It will be marked as PAID once verified by our staff/admin."
        : null;


    return (

        <div className="min-h-screen flex items-center justify-center px-6">

            <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white/95 p-8 text-center shadow-xl shadow-amber-900/5 backdrop-blur-sm">

                {/* Success Icon */}

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                    ✓
                </div>


                {/* Title */}

                <h1 className="mt-6 text-3xl font-bold text-gray-900">
                    Order Successful!
                </h1>


                <p className="mt-2 text-gray-600">
                    Your order has been placed successfully.
                </p>


                {/* Order Details */}

                <div className="mt-8 rounded-xl bg-gray-50 p-5 text-left">

                    <div className="flex justify-between">

                        <span className="text-gray-600">
                            Order ID
                        </span>

                        <span className="font-semibold text-gray-900">
                            #{orderId || "N/A"}
                        </span>

                    </div>


                    <div className="mt-4 flex justify-between">

                        <span className="text-gray-600">
                            Payment Mode
                        </span>

                        <span className="font-semibold text-gray-900">
                            {paymentMode === "ONLINE"
                                ? "Online (UPI / Razorpay)"
                                : "Cash"}
                        </span>

                    </div>


                    <div className="mt-4 flex justify-between">

                        <span className="text-gray-600">
                            Payment Status
                        </span>

                        <span className={`font-semibold ${statusColor}`}>
                            {order || fetchFailed ? statusLabel : "Checking..."}
                        </span>

                    </div>

                </div>


                {/* Cash payment helper note */}

                {helperText && (
                    <p className="mt-4 rounded-xl border border-orange-200/80 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                        💵 {helperText}
                    </p>
                )}


                {/* Buttons */}

                <div className="mt-8 space-y-3">

                    <Link
                        href="/orders"
                        className="block w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                    >
                        View My Orders
                    </Link>


                    <Link
                        href="/items"
                        className="block w-full rounded-lg border px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Continue Shopping
                    </Link>

                </div>

            </div>

        </div>

    );
}

export default function OrderSuccessPage() {

    return (

        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-gray-600">Loading...</p>
                </div>
            }
        >

            <OrderSuccessContent />

        </Suspense>

    );

}