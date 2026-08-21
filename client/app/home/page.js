"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import chaiImg from "@/app/images/chai.png";
import coffeeImg from "@/app/images/coffee.png";
import snackImg from "@/app/images/snack.png";

const CATEGORIES_SHOWCASE = [
    {
        name: "Chai / Tea",
        categoryKey: "Chai",
        tagline: "Kadak Masala, Elaichi & Irani Blends",
        image: chaiImg,
        badge: "Top Seller",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
        priceStarting: "From ₹30",
        emoji: "🍵",
    },
    {
        name: "Specialty Coffee",
        categoryKey: "Coffee",
        tagline: "Cappuccino, Latte & Fresh Espresso",
        image: coffeeImg,
        badge: "Chef's Choice",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
        priceStarting: "From ₹50",
        emoji: "☕",
    },
    {
        name: "Fresh Snacks",
        categoryKey: "Snacks",
        tagline: "Crispy Samosas, Sandwiches & Biscuits",
        image: snackImg,
        badge: "Fresh Daily",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
        priceStarting: "From ₹15",
        emoji: "🥐",
    },
];

const HIGHLIGHTS = [
    {
        icon: "☕",
        title: "Freshly Brewed",
        description: "Handcrafted beverages brewed on-demand for every order.",
    },
    {
        icon: "🍵",
        title: "Authentic Recipes",
        description: "Pure ingredients, aromatic spices, and gourmet roast beans.",
    },
    {
        icon: "🥐",
        title: "Tasty Snacks",
        description: "Hot crispy samosas, grilled sandwiches & fresh bakes.",
    },
    {
        icon: "⚡",
        title: "Live Order Tracking",
        description: "Watch order progress in real-time with instant bill printing.",
    },
];

export default function HomePage() {
    const [minPrices, setMinPrices] = useState({});

    useEffect(() => {
        const fetchMinPrices = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
                const response = await fetch(`${apiUrl}/api/products`);
                if (!response.ok) return;

                const data = await response.json();
                const products = data.products || [];

                const prices = {};

                CATEGORIES_SHOWCASE.forEach((cat) => {
                    const targetKey = cat.categoryKey.toLowerCase();
                    const matchedProducts = products.filter((p) => {
                        const productCat = (p.category || "").toLowerCase();
                        const productName = (p.name || "").toLowerCase();

                        if (targetKey === "chai") {
                            return (
                                productCat === "chai" ||
                                productCat === "tea" ||
                                productName.includes("chai") ||
                                productName.includes("tea")
                            );
                        }
                        if (targetKey === "coffee") {
                            return (
                                productCat === "coffee" ||
                                productName.includes("coffee") ||
                                productName.includes("latte") ||
                                productName.includes("cappuccino") ||
                                productName.includes("espresso")
                            );
                        }
                        if (targetKey === "snacks") {
                            return (
                                productCat === "snacks" ||
                                productCat === "snack" ||
                                productCat === "food"
                            );
                        }
                        return productCat === targetKey;
                    });

                    if (matchedProducts.length > 0) {
                        const validPrices = matchedProducts
                            .map((p) => Number(p.price))
                            .filter((p) => !isNaN(p) && p >= 0);

                        if (validPrices.length > 0) {
                            const min = Math.min(...validPrices);
                            prices[cat.categoryKey] = `From ₹${min}`;
                        }
                    }
                });

                setMinPrices(prices);
            } catch (error) {
                console.error("Failed to fetch products for category minimum prices:", error);
            }
        };

        fetchMinPrices();
    }, []);
    return (
        <ProtectedRoute>
            <div className="min-h-screen pb-16">
                <Navbar />

                <main className="mx-auto max-w-7xl px-4 sm:px-6">
                    {/* Hero & Category Hub - Balanced Top Fold */}
                    <section className="relative mt-6 overflow-hidden rounded-3xl border border-stone-200/80 bg-gradient-to-b from-white/95 via-white/90 to-orange-50/40 p-6 shadow-xl shadow-amber-950/5 backdrop-blur-md sm:p-10 lg:p-12">
                        {/* Decorative background glow */}
                        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

                        {/* Top Hero Text */}
                        <div className="relative z-10 mx-auto max-w-3xl text-center">
                            {/* Pill badge */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-orange-700 shadow-2xs">
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                <span>Freshly Brewed • Artisanal Cafe Experience</span>
                            </div>

                            {/* Headline */}
                            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-5xl">
                                Sip the <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">Extraordinary</span>
                            </h1>

                            {/* Subtitle */}
                            <p className="mt-3 text-sm text-stone-600 sm:text-base">
                                Handcrafted chais, specialty coffees, and oven-fresh snacks. Quick booking, fast preparation, and warm hospitality.
                            </p>

                            {/* CTA Action Buttons */}
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
                                <Link
                                    href="/items"
                                    className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-600/35 active:translate-y-0 active:scale-95"
                                >
                                    <span>Order Now</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                        />
                                    </svg>
                                </Link>

                                <Link
                                    href="/orders"
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white/90 px-7 py-3 text-sm font-bold text-stone-700 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 active:translate-y-0 active:scale-95"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-stone-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                        />
                                    </svg>
                                    <span>View My Orders</span>
                                </Link>
                            </div>
                        </div>

                        {/* Interactive Visual Category Cards Directly in Hero Viewport */}
                        <div className="mt-8 pt-6 border-t border-stone-200/70">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    Featured Categories
                                </span>
                                <Link
                                    href="/items"
                                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                >
                                    Browse Full Menu →
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {CATEGORIES_SHOWCASE.map((cat) => (
                                    <Link
                                        key={cat.name}
                                        href={`/items?category=${cat.categoryKey}`}
                                        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-950/5"
                                    >
                                        {/* Image thumbnail */}
                                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 shadow-inner">
                                            <img
                                                src={cat.image?.src || cat.image}
                                                alt={cat.name}
                                                className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110"
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs">{cat.emoji}</span>
                                                <h3 className="truncate text-sm font-bold text-stone-900 transition-colors group-hover:text-orange-600">
                                                    {cat.name}
                                                </h3>
                                            </div>
                                            <p className="mt-0.5 truncate text-[11px] text-stone-500">
                                                {cat.tagline}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200/60">
                                                    {minPrices[cat.categoryKey] || cat.priceStarting}
                                                </span>
                                                <span className="text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                                                    Order →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Features & Experience Section */}
                    <section className="mt-8 rounded-3xl border border-stone-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                        <div className="mb-6 flex flex-col items-center justify-between gap-1 text-center sm:flex-row sm:text-left">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-orange-600">
                                    The Cafe App Difference
                                </span>
                                <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">
                                    Why Customers Love Us
                                </h2>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-stone-500">
                                <span className="flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold">✓</span> 100% Fresh
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold">✓</span> Fast Service
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold">✓</span> Thermal Invoices
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {HIGHLIGHTS.map((h) => (
                                <div
                                    key={h.title}
                                    className="group relative overflow-hidden rounded-2xl border border-stone-200/70 bg-gradient-to-b from-stone-50/90 via-white to-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10"
                                >
                                    {/* Ambient glow effect on hover */}
                                    <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-orange-400/0 blur-2xl transition-all duration-500 group-hover:bg-orange-400/20" />

                                    {/* Top accent line indicator on hover */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                                    <div className="relative z-10">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100/90 text-2xl shadow-2xs transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-orange-500 group-hover:shadow-md group-hover:shadow-orange-500/25">
                                            <span className="transition-transform duration-300 group-hover:scale-110">
                                                {h.icon}
                                            </span>
                                        </div>
                                        <h3 className="mt-4 text-sm font-bold text-stone-900 transition-colors duration-200 group-hover:text-orange-600">
                                            {h.title}
                                        </h3>
                                        <p className="mt-1.5 text-xs text-stone-600 leading-relaxed transition-colors duration-200 group-hover:text-stone-700">
                                            {h.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Quick Action Footer Banner */}
                    <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 text-white shadow-xl sm:p-8">
                        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                            <div>
                                <h3 className="text-xl font-bold sm:text-2xl">
                                    Craving fresh Chai, Coffee, or Snacks?
                                </h3>
                                <p className="mt-1 text-xs text-stone-300">
                                    Browse the full menu, customize your order, and pick up in minutes.
                                </p>
                            </div>
                            <Link
                                href="/items"
                                className="shrink-0 cursor-pointer rounded-2xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-500 active:scale-95"
                            >
                                Browse Full Menu →
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </ProtectedRoute>
    );
}