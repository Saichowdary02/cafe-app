"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderSuccessContent() {

    const searchParams = useSearchParams();

    const orderId = searchParams.get("orderId");

    const isPaid = searchParams.get("paid") === "1";


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
                            Status
                        </span>

                        {isPaid ? (
                            <span className="font-semibold text-green-600">
                                PAID (Online)
                            </span>
                        ) : (
                            <span className="font-semibold text-orange-600">
                                PENDING
                            </span>
                        )}

                    </div>

                </div>


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