"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import chaiImg from "@/app/images/chai.png";
import coffeeImg from "@/app/images/coffee.png";
import snackImg from "@/app/images/snack.png";
import { calculateBillBreakdown, DEFAULT_BILL_SETTINGS } from "@/lib/billCalculator";

function getCartItemImage(item) {
    if (item?.image) return item.image;
    const cat = item?.category?.toLowerCase() || "";
    const name = item?.name?.toLowerCase() || "";

    if (cat === "chai" || cat === "tea" || name.includes("chai") || name.includes("tea")) {
        return chaiImg.src;
    }
    if (cat === "coffee" || name.includes("coffee") || name.includes("latte") || name.includes("cappuccino") || name.includes("espresso")) {
        return coffeeImg.src;
    }
    if (cat === "snacks" || cat === "snack" || cat === "food") {
        return snackImg.src;
    }
    return null;
}

export default function CartPage() {

    const router = useRouter();

    const [cart, setCart] = useState([]);
    const [billSettings, setBillSettings] = useState(DEFAULT_BILL_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [error, setError] = useState("");


    // Load cart from localStorage & fetch bill settings
    useEffect(() => {
        const savedCart = localStorage.getItem("cart");

        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error("Failed to load cart:", error);
                localStorage.removeItem("cart");
            }
        }

        const fetchSettings = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                const res = await fetch(`${apiUrl}/api/bill/settings`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.settings) {
                        setBillSettings(data.settings);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch bill settings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);


    // Save cart to state + localStorage
    const updateCart = (updatedCart) => {

        setCart(updatedCart);

        localStorage.setItem(
            "cart",
            JSON.stringify(updatedCart)
        );

    };


    // Increase quantity
    const increaseQuantity = (productId) => {

        const updatedCart = cart.map((item) =>
            item.id === productId
                ? {
                    ...item,
                    quantity: item.quantity + 1
                }
                : item
        );

        updateCart(updatedCart);

    };


    // Decrease quantity
    const decreaseQuantity = (productId) => {

        const updatedCart = cart
            .map((item) =>
                item.id === productId
                    ? {
                        ...item,
                        quantity: item.quantity - 1
                    }
                    : item
            )
            .filter((item) => item.quantity > 0);

        updateCart(updatedCart);

    };


    // Remove product
    const removeItem = (productId) => {

        const updatedCart = cart.filter(
            (item) => item.id !== productId
        );

        updateCart(updatedCart);

    };


    // Calculate subtotal & bill breakdown
    const subtotal = cart.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
    );

    const bill = calculateBillBreakdown(subtotal, billSettings);

    // Calculate total quantity
    const totalItems = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );


    // Place order
    const handlePlaceOrder = async () => {

        if (cart.length === 0) {
            return;
        }

        setPlacingOrder(true);
        setError("");


        try {

            /*
             * Get JWT token.
             *
             * Change "token" if your application
             * uses a different localStorage key.
             */
            const token = localStorage.getItem("token");


            if (!token) {

                setError(
                    "You are not authenticated. Please login again."
                );

                setPlacingOrder(false);

                return;
            }


            /*
             * Backend expects:
             *
             * {
             *     items: [
             *         {
             *             product_id: 4,
             *             quantity: 2
             *         }
             *     ]
             * }
             */

            const orderItems = cart.map((item) => ({

                product_id: item.id,

                quantity: item.quantity

            }));


            const response = await fetch(
                "http://localhost:5000/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",

                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        items: orderItems
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message || "Failed to place order"
                );

            }


            console.log(
                "Order created successfully:",
                data.order
            );


            /*
             * Clear cart ONLY after successful
             * order creation.
             */
            localStorage.removeItem("cart");

            setCart([]);


            /*
             * Redirect to order success page.
             */
            router.push(
                `/order-success?orderId=${data.order.id}`
            );


        } catch (error) {

            console.error(
                "Place order error:",
                error
            );

            setError(
                error.message ||
                "Unable to place order. Please try again."
            );

        } finally {

            setPlacingOrder(false);

        }

    };


    // Loading state
    if (loading) {

        return (

            <ProtectedRoute>

                <div className="min-h-screen">

                    <Navbar />

                    <main className="mx-auto max-w-7xl px-6 py-10">

                        <p className="text-gray-600">
                            Loading cart...
                        </p>

                    </main>

                </div>

            </ProtectedRoute>

        );

    }


    return (

        <ProtectedRoute>

            <div className="min-h-screen">

                <Navbar />


                <main className="mx-auto max-w-7xl px-6 py-10">


                    {/* Header */}

                    <div className="mb-10">

                        <h1 className="text-4xl font-bold text-gray-900">
                            Your Cart
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Review your items before placing your order.
                        </p>

                    </div>


                    {/* Error */}

                    {error && (

                        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">

                            {error}

                        </div>

                    )}


                    {/* Empty Cart */}
                    {cart.length === 0 ? (
                        <div className="mx-auto max-w-lg rounded-3xl border border-stone-200/80 bg-white/95 p-12 text-center shadow-xl shadow-amber-900/5 backdrop-blur-md">
                            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100 text-5xl shadow-inner">
                                🛒
                            </div>

                            <h2 className="mt-6 text-2xl font-bold text-gray-900">
                                Your cart is empty
                            </h2>

                            <p className="mt-2 text-stone-500">
                                Looks like you haven&apos;t added any delicious chai, coffee, or snacks yet.
                            </p>

                            <Link
                                href="/items"
                                className="group mt-8 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 py-3.5 font-semibold text-white shadow-md shadow-orange-500/25 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/35 active:scale-95"
                            >
                                <span>Browse Menu</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            {/* Cart Items */}
                            <div className="space-y-4 lg:col-span-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:flex-row sm:items-center sm:gap-6"
                                    >
                                        {/* Image */}
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200/60 bg-stone-100/70 shadow-2xs">
                                            {getCartItemImage(item) ? (
                                                <img
                                                    src={getCartItemImage(item)}
                                                    alt={item.name}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/60 text-3xl">
                                                    {item.category === "Coffee" ? "☕" : item.category === "Chai" ? "🍵" : "🥐"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Details */}
                                        <div className="min-w-0 flex-1">
                                            <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-orange-700 border border-orange-100">
                                                {item.category}
                                            </span>

                                            <h2 className="mt-1 truncate text-base font-bold text-gray-900 transition-colors group-hover:text-orange-600">
                                                {item.name}
                                            </h2>

                                            <p className="mt-0.5 text-xs font-medium text-stone-500">
                                                ₹{Number(item.price).toFixed(2)} each
                                            </p>
                                        </div>

                                        {/* Stepper, Subtotal & Delete */}
                                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                                            {/* Quantity Stepper */}
                                            <div className="flex items-center rounded-xl border border-stone-200/80 bg-stone-50/80 p-1 shadow-2xs">
                                                <button
                                                    onClick={() => decreaseQuantity(item.id)}
                                                    disabled={placingOrder}
                                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white font-bold text-stone-700 shadow-2xs transition-all hover:bg-orange-50 hover:text-orange-600 active:scale-90 disabled:opacity-50"
                                                    title="Decrease quantity"
                                                >
                                                    −
                                                </button>

                                                <span className="w-8 text-center text-sm font-extrabold text-stone-900">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    onClick={() => increaseQuantity(item.id)}
                                                    disabled={placingOrder}
                                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white font-bold text-stone-700 shadow-2xs transition-all hover:bg-orange-50 hover:text-orange-600 active:scale-90 disabled:opacity-50"
                                                    title="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Subtotal */}
                                            <div className="w-20 text-right">
                                                <p className="text-base font-extrabold text-gray-900">
                                                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                disabled={placingOrder}
                                                className="group/del flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:opacity-50"
                                                title="Remove item"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 transition-transform group-hover/del:scale-110"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Summary & Detailed Bill Breakdown */}
                            <div className="sticky top-24 h-fit rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-xl shadow-amber-900/5 backdrop-blur-md sm:p-7">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                                    <h2 className="text-xl font-extrabold text-gray-900">
                                        Bill Details
                                    </h2>
                                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200/70">
                                        {totalItems} {totalItems === 1 ? "Item" : "Items"}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                                    {/* Subtotal */}
                                    <div className="flex items-center justify-between text-stone-700">
                                        <div>
                                            <span className="font-medium">Subtotal</span>
                                            <span className="ml-1 text-[11px] text-stone-400">(Food & Snacks)</span>
                                        </div>
                                        <span className="font-semibold text-stone-900">₹{bill.subtotal.toFixed(2)}</span>
                                    </div>

                                    {/* Packaging Fee */}
                                    <div className="flex items-center justify-between text-stone-700">
                                        <div>
                                            <span className="font-medium">Packaging Fee</span>
                                            <span className="ml-1 rounded-md bg-stone-100 px-1.5 py-0.2 text-[10px] font-semibold text-stone-600">
                                                {bill.packaging_fee_percent}%
                                            </span>
                                        </div>
                                        <span className="font-semibold text-stone-900">₹{bill.packaging_fee.toFixed(2)}</span>
                                    </div>

                                    {/* Platform Fee */}
                                    <div className="flex items-center justify-between text-stone-700">
                                        <div>
                                            <span className="font-medium">Platform Fee</span>
                                            <span className="ml-1 text-[11px] text-stone-400">(App fee)</span>
                                        </div>
                                        <span className="font-semibold text-stone-900">₹{bill.platform_fee.toFixed(2)}</span>
                                    </div>

                                    {/* Taxes Section */}
                                    <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>CGST ({bill.cgst_percent}%)</span>
                                            <span className="font-medium text-stone-800">₹{bill.cgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>SGST ({bill.sgst_percent}%)</span>
                                            <span className="font-medium text-stone-800">₹{bill.sgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>GST on Platform Fee ({bill.platform_fee_gst_percent}%)</span>
                                            <span className="font-medium text-stone-800">₹{bill.platform_fee_gst.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Calculated Total */}
                                    <div className="flex items-center justify-between pt-2 text-stone-600">
                                        <span className="text-xs">Calculated Total</span>
                                        <span className="font-semibold text-stone-700">₹{bill.calculated_total.toFixed(2)}</span>
                                    </div>

                                    {/* Rounding Off */}
                                    {bill.rounding_off !== 0 && (
                                        <div className="flex items-center justify-between text-stone-500 text-xs">
                                            <span>Rounding Off (Ceil)</span>
                                            <span className="font-medium text-stone-700">
                                                {bill.rounding_off > 0 ? `+₹${bill.rounding_off.toFixed(2)}` : `-₹${Math.abs(bill.rounding_off).toFixed(2)}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Grand Total */}
                                <div className="mt-4 border-t border-stone-200/90 pt-4">
                                    <div className="flex items-baseline justify-between">
                                        <div>
                                            <span className="text-base font-extrabold text-stone-900">Grand Total</span>
                                            <span className="block text-[11px] font-medium text-stone-500">Payable Amount</span>
                                        </div>
                                        <span className="text-2xl font-black text-orange-600">
                                            ₹{bill.grand_total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Error message if any */}
                                {error && (
                                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-semibold text-red-600">
                                        {error}
                                    </div>
                                )}

                                {/* Place Order Button */}
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={placingOrder || cart.length === 0}
                                    className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-orange-500/25 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/35 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {placingOrder ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Placing Order...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Place Order</span>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                                {/* Continue Shopping Link */}
                                <Link
                                    href="/items"
                                    className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-stone-600 transition-colors hover:text-orange-600"
                                >
                                    <span>← Continue Shopping</span>
                                </Link>
                            </div>
                        </div>
                    )}

                </main>

            </div>

        </ProtectedRoute>

    );

}