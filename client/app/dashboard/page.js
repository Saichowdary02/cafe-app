"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";

const PERIOD_OPTIONS = [
    { value: "1h",  label: "Last 1 Hour" },
    { value: "3h",  label: "Last 3 Hours" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "3d",  label: "Last 3 Days" },
    { value: "7d",  label: "Last 7 Days" },
];

// Visual styling per product category
const CATEGORY_META = {
    Chai:   { emoji: "🍵", bar: "from-amber-400 to-orange-500" },
    Coffee: { emoji: "☕", bar: "from-amber-800 to-stone-800" },
    Snacks: { emoji: "🍪", bar: "from-orange-400 to-red-400" },
};
const CATEGORY_META_DEFAULT = { emoji: "🛒", bar: "from-stone-400 to-stone-500" };

export default function DashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [period, setPeriod] = useState("24h");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => setToast({ message, type });
    const getToken = () => localStorage.getItem("token");

    // Fetch dashboard stats
    const fetchStats = useCallback(async (p) => {
        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/dashboard/stats?period=${p}`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            if (!res.ok) throw new Error("Failed to fetch stats");
            const data = await res.json();
            setStats(data);
        } catch {
            showToast("Failed to load dashboard data", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    // Guard: admin-only
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (!userData) { router.push("/login"); return; }
        const parsed = JSON.parse(userData);
        if (parsed.role !== "ADMIN") { router.push("/home"); return; }
        setUser(parsed);
        fetchStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch when period changes
    useEffect(() => {
        if (user) fetchStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    const formatCurrency = (n) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(n);

    // Category Performance: compute each category's share of items sold
    const rawCategories = stats?.category_performance || [];
    const totalItemsSold = rawCategories.reduce((sum, c) => sum + c.items_sold, 0);
    const categories = rawCategories.map((c) => ({
        ...c,
        share_percent:
            totalItemsSold > 0
                ? Math.round((c.items_sold / totalItemsSold) * 100)
                : 0,
    }));

    // Peak Hours: find the busiest 2-hour bucket
    const peakHours = stats?.peak_hours || [];
    const peakMax = peakHours.reduce((max, b) => Math.max(max, b.order_count), 0);
    const peakHotIndex = peakHours.reduce(
        (best, b, i) => (b.order_count > 0 && b.order_count > (peakHours[best]?.order_count ?? 0) ? i : best),
        -1
    );

    // Stat card data
    const statCards = stats
        ? [
              {
                  label: "Total Orders",
                  value: stats.total_orders,
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                  ),
                  color: "from-blue-500 to-indigo-600",
                  bgLight: "bg-blue-50",
                  textColor: "text-blue-700",
              },
              {
                  label: "Pending",
                  value: stats.pending,
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  ),
                  color: "from-amber-400 to-orange-500",
                  bgLight: "bg-amber-50",
                  textColor: "text-amber-700",
              },
              {
                  label: "Preparing",
                  value: stats.preparing,
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                      </svg>
                  ),
                  color: "from-orange-500 to-red-500",
                  bgLight: "bg-orange-50",
                  textColor: "text-orange-700",
              },
              {
                  label: "Delivered",
                  value: stats.completed,
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  ),
                  color: "from-emerald-500 to-green-600",
                  bgLight: "bg-emerald-50",
                  textColor: "text-emerald-700",
              },
              {
                  label: "Total Revenue",
                  value: formatCurrency(stats.total_revenue),
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  ),
                  color: "from-violet-500 to-purple-600",
                  bgLight: "bg-violet-50",
                  textColor: "text-violet-700",
                  large: true,
              },
              {
                  label: "Avg Order Value",
                  value: formatCurrency(stats.avg_order_value),
                  icon: (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                  ),
                  color: "from-pink-500 to-rose-600",
                  bgLight: "bg-pink-50",
                  textColor: "text-pink-700",
                  large: true,
              },
          ]
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-white">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900 sm:text-3xl">
                            📊 Dashboard
                        </h1>
                        <p className="mt-1 text-sm font-medium text-stone-500">
                            Real-time order analytics & revenue overview
                        </p>
                    </div>

                    {/* Period Dropdown */}
                    <div className="relative">
                        <select
                            id="dashboard-period-select"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="appearance-none rounded-xl border border-stone-200 bg-white px-4 py-2.5 pr-10 text-sm font-bold text-stone-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 cursor-pointer"
                        >
                            {PERIOD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <svg
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
                        <p className="text-sm font-medium text-stone-400">Loading dashboard...</p>
                    </div>
                ) : stats ? (
                    <>
                        {/* Stat Cards Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {statCards.map((card) => (
                                <div
                                    key={card.label}
                                    className={`group relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                                        card.large ? "sm:col-span-1" : ""
                                    }`}
                                >
                                    {/* Gradient accent bar */}
                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.color}`} />

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                                                {card.label}
                                            </p>
                                            <p className={`mt-2 text-3xl font-black ${card.textColor}`}>
                                                {card.value}
                                            </p>
                                        </div>
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bgLight} ${card.textColor} transition-transform group-hover:scale-110`}
                                        >
                                            {card.icon}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top Products Section */}
                        <div className="mt-8 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
                            <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white px-6 py-4">
                                <h2 className="text-base font-black text-stone-800">
                                    🏆 Top Selling Products
                                </h2>
                                <p className="mt-0.5 text-xs font-medium text-stone-400">
                                    Best performers in the selected period
                                </p>
                            </div>

                            {stats.top_products && stats.top_products.length > 0 ? (
                                <div className="divide-y divide-stone-50">
                                    {stats.top_products.map((product, index) => (
                                        <div
                                            key={product.name}
                                            className="flex items-center gap-4 px-6 py-4 transition hover:bg-orange-50/30"
                                        >
                                            {/* Rank Badge */}
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm ${
                                                    index === 0
                                                        ? "bg-gradient-to-tr from-amber-400 to-yellow-500"
                                                        : index === 1
                                                        ? "bg-gradient-to-tr from-stone-400 to-stone-500"
                                                        : index === 2
                                                        ? "bg-gradient-to-tr from-amber-600 to-amber-700"
                                                        : "bg-gradient-to-tr from-stone-300 to-stone-400"
                                                }`}
                                            >
                                                #{index + 1}
                                            </div>

                                            {/* Product Name */}
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm font-bold text-stone-800">
                                                    {product.name}
                                                </p>
                                            </div>

                                            {/* Quantity */}
                                            <div className="text-right">
                                                <span className="rounded-lg bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-800">
                                                    {product.quantity_sold} sold
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
                                        <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-stone-400">
                                        No product sales in this period
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Analytics: Category Performance & Peak Hours */}
                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Category Performance */}
                            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
                                <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white px-6 py-4">
                                    <h2 className="text-base font-black text-stone-800">
                                        ☕ Category Performance
                                    </h2>
                                    <p className="mt-0.5 text-xs font-medium text-stone-400">
                                        Sales mix in the selected period
                                    </p>
                                </div>

                                {categories.length > 0 ? (
                                    <div className="space-y-5 px-6 py-5">
                                        {categories.map((cat) => {
                                            const meta =
                                                CATEGORY_META[cat.category] ||
                                                CATEGORY_META_DEFAULT;
                                            return (
                                                <div key={cat.category}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm font-bold text-stone-700">
                                                            {meta.emoji} {cat.category}
                                                        </span>
                                                        <span className="shrink-0 text-xs font-extrabold text-stone-500">
                                                            {cat.share_percent}% ·{" "}
                                                            {formatCurrency(cat.revenue)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-stone-100">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all duration-500`}
                                                            style={{
                                                                width: `${cat.share_percent}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="mt-1.5 text-[11px] font-semibold text-stone-400">
                                                        {cat.items_sold} items sold across{" "}
                                                        {cat.orders_count} orders
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-2xl">
                                            ☕
                                        </div>
                                        <p className="text-sm font-medium text-stone-400">
                                            No category sales in this period
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Peak Hours */}
                            <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
                                <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white px-6 py-4">
                                    <h2 className="text-base font-black text-stone-800">
                                        🕐 Peak Hours
                                    </h2>
                                    <p className="mt-0.5 text-xs font-medium text-stone-400">
                                        Orders by time of day (2-hour slots)
                                    </p>
                                </div>

                                {!stats.peak_hours_available ? (
                                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                                            <svg
                                                className="h-7 w-7 text-amber-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={1.5}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-bold text-stone-700">
                                            Peak hours need a longer window
                                        </p>
                                        <p className="max-w-xs text-xs font-medium text-stone-400">
                                            Peak hours can be shown based on Last 24
                                            Hours, Last 3 Days, or Last 7 Days. Switch
                                            the time period above to view them.
                                        </p>
                                    </div>
                                ) : peakHours.length > 0 ? (
                                    <div className="space-y-2.5 px-6 py-5">
                                        {peakHours.map((bucket, index) => {
                                            const isHot =
                                                index === peakHotIndex && peakMax > 0;
                                            const width =
                                                peakMax > 0
                                                    ? (bucket.order_count / peakMax) * 100
                                                    : 0;
                                            return (
                                                <div
                                                    key={bucket.label}
                                                    className="flex items-center gap-3"
                                                >
                                                    <span
                                                        className={`w-24 shrink-0 text-[10px] font-extrabold tracking-tight ${
                                                            isHot
                                                                ? "text-orange-700"
                                                                : "text-stone-500"
                                                        }`}
                                                    >
                                                        {bucket.label}
                                                    </span>
                                                    <div className="h-5 flex-1 overflow-hidden rounded-lg bg-stone-100">
                                                        <div
                                                            className={`h-full rounded-lg transition-all duration-500 ${
                                                                isHot
                                                                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                                                                    : "bg-gradient-to-r from-amber-300 to-orange-400"
                                                            }`}
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`w-7 shrink-0 text-right text-[11px] font-extrabold ${
                                                            isHot
                                                                ? "text-orange-700"
                                                                : "text-stone-600"
                                                        }`}
                                                    >
                                                        {bucket.order_count}
                                                    </span>
                                                    {isHot && (
                                                        <span className="text-xs">🔥</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-2xl">
                                            🕐
                                        </div>
                                        <p className="text-sm font-medium text-stone-400">
                                            No orders in this period yet
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Period Badge */}
                        <div className="mt-6 flex items-center justify-center">
                            <span className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-bold text-stone-500 shadow-sm">
                                Showing data for:{" "}
                                <span className="text-orange-600">
                                    {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
                                </span>
                            </span>
                        </div>
                    </>
                ) : null}
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
