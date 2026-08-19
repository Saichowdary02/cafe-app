"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

const FEATURES = [
    {
        icon: "☕",
        title: "Fresh Coffee",
        description: "Handcrafted coffee and tea, made fresh for every order.",
    },
    {
        icon: "🍵",
        title: "Wide Variety",
        description: "From classic brews to seasonal specials — something for everyone.",
    },
    {
        icon: "🍰",
        title: "Tasty Bites",
        description: "Pair your drink with cookies, puffs, and other snacks.",
    },
    {
        icon: "⚡",
        title: "Quick & Easy",
        description: "Order in a few taps and track your order status live.",
    },
];

export default function HomePage() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">

                <Navbar />

                <main>

                    {/* Hero section */}
                    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">

                        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
                            Welcome to Cafe App ☕
                        </h1>

                        <p className="mt-4 text-xl text-gray-600">
                            This is a coffee and tea booking app.
                        </p>

                        <p className="mt-2 max-w-xl text-gray-500">
                            Browse our menu, choose your favorite items,
                            and place your order easily.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                            <Link
                                href="/items"
                                className="rounded-lg bg-orange-600 px-8 py-3 font-semibold text-white hover:bg-orange-700"
                            >
                                Browse Menu
                            </Link>

                            <Link
                                href="/orders"
                                className="rounded-lg border bg-white px-8 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                View My Orders
                            </Link>

                        </div>

                    </div>


                    {/* Feature cards */}
                    <div className="mx-auto max-w-7xl px-6 pb-24">

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                            {FEATURES.map((feature) => (

                                <div
                                    key={feature.title}
                                    className="rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:shadow-md"
                                >

                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-3xl">
                                        {feature.icon}
                                    </div>

                                    <h3 className="mt-4 font-semibold text-gray-900">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-600">
                                        {feature.description}
                                    </p>

                                </div>

                            ))}

                        </div>

                    </div>

                </main>

            </div>
        </ProtectedRoute>
    );
}