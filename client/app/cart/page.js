"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CartPage() {

    const router = useRouter();

    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [error, setError] = useState("");


    // Load cart from localStorage
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

        setLoading(false);

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


    // Calculate total
    const total = cart.reduce(
        (sum, item) =>
            sum + Number(item.price) * item.quantity,
        0
    );


    // Calculate total quantity
    const totalItems = cart.reduce(
        (sum, item) =>
            sum + item.quantity,
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

                <div className="min-h-screen bg-gray-50">

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

            <div className="min-h-screen bg-gray-50">

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

                        <div className="rounded-xl border bg-white p-12 text-center">

                            <div className="text-6xl">
                                🛒
                            </div>


                            <h2 className="mt-5 text-2xl font-bold text-gray-900">
                                Your cart is empty
                            </h2>


                            <p className="mt-2 text-gray-600">
                                Add some delicious items from our menu.
                            </p>


                            <Link
                                href="/items"
                                className="mt-6 inline-block rounded-lg bg-orange-600 px-6 py-3 font-medium text-white hover:bg-orange-700"
                            >
                                Browse Items
                            </Link>

                        </div>

                    ) : (

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">


                            {/* Cart Items */}

                            <div className="space-y-4 lg:col-span-2">

                                {cart.map((item) => (

                                    <div
                                        key={item.id}
                                        className="flex items-center gap-5 rounded-xl border bg-white p-5 shadow-sm"
                                    >


                                        {/* Image */}

                                        {item.image ? (

                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="h-24 w-24 rounded-lg object-cover"
                                            />

                                        ) : (

                                            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-4xl">
                                                ☕
                                            </div>

                                        )}


                                        {/* Product Details */}

                                        <div className="flex-1">

                                            <p className="text-sm text-orange-600">
                                                {item.category}
                                            </p>


                                            <h2 className="text-lg font-bold text-gray-900">
                                                {item.name}
                                            </h2>


                                            <p className="mt-1 font-semibold text-gray-900">
                                                ₹{Number(item.price).toFixed(2)}
                                            </p>

                                        </div>


                                        {/* Quantity */}

                                        <div className="flex items-center gap-3">

                                            <button
                                                onClick={() =>
                                                    decreaseQuantity(item.id)
                                                }
                                                disabled={placingOrder}
                                                className="flex h-9 w-9 items-center justify-center rounded-md border text-lg font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                −
                                            </button>


                                            <span className="w-6 text-center font-semibold">
                                                {item.quantity}
                                            </span>


                                            <button
                                                onClick={() =>
                                                    increaseQuantity(item.id)
                                                }
                                                disabled={placingOrder}
                                                className="flex h-9 w-9 items-center justify-center rounded-md border text-lg font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                +
                                            </button>

                                        </div>


                                        {/* Subtotal */}

                                        <div className="w-24 text-right">

                                            <p className="font-bold text-gray-900">

                                                ₹
                                                {(
                                                    Number(item.price) *
                                                    item.quantity
                                                ).toFixed(2)}

                                            </p>

                                        </div>


                                        {/* Remove */}

                                        <button
                                            onClick={() =>
                                                removeItem(item.id)
                                            }
                                            disabled={placingOrder}
                                            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Remove
                                        </button>

                                    </div>

                                ))}

                            </div>


                            {/* Order Summary */}

                            <div className="h-fit rounded-xl border bg-white p-6 shadow-sm">

                                <h2 className="text-xl font-bold text-gray-900">
                                    Order Summary
                                </h2>


                                {/* Items */}

                                <div className="mt-6 flex justify-between text-gray-600">

                                    <span>
                                        Items
                                    </span>

                                    <span>
                                        {totalItems}
                                    </span>

                                </div>


                                {/* Total */}

                                <div className="mt-4 flex justify-between text-lg font-bold text-gray-900">

                                    <span>
                                        Total
                                    </span>

                                    <span>
                                        ₹{total.toFixed(2)}
                                    </span>

                                </div>


                                {/* Error */}

                                {error && (

                                    <p className="mt-4 text-sm text-red-600">
                                        {error}
                                    </p>

                                )}


                                {/* Place Order */}

                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={placingOrder || cart.length === 0}
                                    className="mt-6 w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >

                                    {placingOrder
                                        ? "Placing Order..."
                                        : "Place Order"}

                                </button>


                                {/* Continue Shopping */}

                                <Link
                                    href="/items"
                                    className="mt-3 block text-center text-sm text-gray-600 hover:text-orange-600"
                                >
                                    Continue Shopping
                                </Link>

                            </div>

                        </div>

                    )}

                </main>

            </div>

        </ProtectedRoute>

    );

}