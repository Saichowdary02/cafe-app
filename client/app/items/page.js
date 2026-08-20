"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import chaiImg from "@/app/images/chai.png";
import coffeeImg from "@/app/images/coffee.png";
import snackImg from "@/app/images/snack.png";

const CATEGORIES = [
    { id: "All", label: "All Items", icon: "✨" },
    { id: "Chai", label: "Chai / Tea", icon: "🍵" },
    { id: "Coffee", label: "Coffee", icon: "☕" },
    { id: "Snacks", label: "Snacks", icon: "🥐" },
];

function getItemImage(product) {
    const cat = product?.category?.toLowerCase() || "";
    const name = product?.name?.toLowerCase() || "";

    if (cat === "chai" || cat === "tea" || name.includes("chai") || name.includes("tea")) {
        return chaiImg;
    }
    if (cat === "coffee" || name.includes("coffee") || name.includes("latte") || name.includes("cappuccino") || name.includes("espresso")) {
        return coffeeImg;
    }
    if (cat === "snacks" || cat === "snack" || cat === "food") {
        return snackImg;
    }
    return product?.image ? { src: product.image } : null;
}

function ItemsContent() {
    const searchParams = useSearchParams();
    const [products, setProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cart, setCart] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [recentlyAddedId, setRecentlyAddedId] = useState(null);
    const [toastMessage, setToastMessage] = useState("");

    // Sync selected category if URL contains ?category=... (e.g. from Home page quick cards)
    useEffect(() => {
        const categoryParam = searchParams.get("category");
        if (categoryParam) {
            const matched = CATEGORIES.find(
                (c) => c.id.toLowerCase() === categoryParam.toLowerCase()
            );
            if (matched) {
                setSelectedCategory(matched.id);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (err) {
                console.error("User parse error:", err);
            }
        }

        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (err) {
                console.error("Cart parse error:", err);
            }
        }

        const fetchProducts = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/products");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to fetch products");
                }

                setProducts(data.products || []);
            } catch (err) {
                console.error(err);
                setError("Unable to load products. Please check if the server is running.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const updateCartState = (newCart) => {
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
    };

    const addToCart = (product) => {
        const existingItem = cart.find((item) => item.id === product.id);
        const itemImg = getItemImage(product);
        const resolvedImage = itemImg?.src || (typeof itemImg === "string" ? itemImg : product.image);

        let updatedCart;
        if (existingItem) {
            updatedCart = cart.map((item) =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        } else {
            updatedCart = [
                ...cart,
                {
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image: resolvedImage,
                    category: product.category,
                    quantity: 1,
                },
            ];
        }

        updateCartState(updatedCart);

        // Visual feedback
        setRecentlyAddedId(product.id);
        setToastMessage(`Added "${product.name}" to cart! 🛒`);

        setTimeout(() => {
            setRecentlyAddedId(null);
        }, 1200);

        setTimeout(() => {
            setToastMessage("");
        }, 2500);
    };

    const decreaseFromCart = (productId) => {
        const updatedCart = cart
            .map((item) =>
                item.id === productId
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            )
            .filter((item) => item.quantity > 0);

        updateCartState(updatedCart);
    };

    // Filter by category and search query
    const filteredProducts = products.filter((product) => {
        const matchesCategory =
            selectedCategory === "All" ||
            product.category?.toLowerCase() === selectedCategory.toLowerCase();

        const matchesSearch =
            !searchQuery.trim() ||
            product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    const isStaffOrAdmin = user?.role === "STAFF" || user?.role === "ADMIN";

    const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalCartAmount = cart.reduce(
        (sum, item) => sum + (item.quantity || 1) * Number(item.price || 0),
        0
    );

    // Group categories for rendering
    const categoriesToRender =
        selectedCategory === "All"
            ? ["Chai", "Coffee", "Snacks"]
            : [selectedCategory];

    return (
        <ProtectedRoute>
            <div className="min-h-screen pb-24">
                <Navbar />

                <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
                    {/* Header Banner */}
                    <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-gradient-to-r from-orange-950 via-stone-900 to-amber-950 p-6 sm:p-10 text-white shadow-xl shadow-amber-950/10 backdrop-blur-md">
                        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300 backdrop-blur-md">
                                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                                    <span>Handcrafted Menu</span>
                                </div>
                                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
                                    Cafe Menu & Treats
                                </h1>
                                <p className="mt-2 max-w-xl text-xs sm:text-sm text-stone-300">
                                    Freshly prepared hot chais, gourmet espresso brews, and crispy snacks made to order.
                                </p>
                            </div>

                            {/* Live Search Bar */}
                            <div className="w-full md:w-80 shrink-0">
                                <div className="relative flex items-center">
                                    <svg
                                        className="absolute left-3.5 h-4 w-4 text-stone-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search chai, coffee, snacks..."
                                        className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-10 pr-10 text-sm text-white placeholder-stone-400 outline-none backdrop-blur-md transition focus:border-orange-400 focus:bg-white/15"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-3.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Filter Pills (Sticky) */}
                    <div className="sticky top-16 z-40 mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 bg-[#faf6f0]/95 py-3.5 backdrop-blur-md shadow-2xs transition-all sm:py-4">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {CATEGORIES.map((cat) => {
                                const isSelected = selectedCategory === cat.id;
                                const count =
                                    cat.id === "All"
                                        ? products.length
                                        : products.filter(
                                            (p) =>
                                                p.category?.toLowerCase() === cat.id.toLowerCase()
                                        ).length;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ease-in-out active:scale-95 ${isSelected
                                            ? "bg-orange-600 text-white shadow-md shadow-orange-600/30 -translate-y-0.5"
                                            : "border border-stone-200/90 bg-white/90 text-stone-700 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700"
                                            }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.label}</span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isSelected
                                                ? "bg-white/20 text-white"
                                                : "bg-stone-100 text-stone-600"
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Indicator */}
                        {searchQuery && (
                            <span className="text-xs font-semibold text-stone-500">
                                Showing results for &ldquo;{searchQuery}&rdquo; ({filteredProducts.length})
                            </span>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="py-24 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl animate-bounce">
                                ☕
                            </div>
                            <p className="mt-4 text-base font-semibold text-stone-700">
                                Loading fresh menu...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
                            <p className="font-semibold text-red-700">{error}</p>
                        </div>
                    )}

                    {/* No Products Found State */}
                    {!loading && !error && filteredProducts.length === 0 && (
                        <div className="my-14 rounded-3xl border border-stone-200/80 bg-white/90 p-12 text-center shadow-sm">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                                🔍
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-stone-900">
                                No items found
                            </h3>
                            <p className="mt-1 text-sm text-stone-500">
                                Try selecting another category or clear your search query.
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="mt-5 inline-flex cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}

                    {/* Product Sections */}
                    {!loading && !error && filteredProducts.length > 0 && (
                        <div className="mt-8 space-y-12">
                            {categoriesToRender.map((category) => {
                                const sectionProducts = filteredProducts.filter((product) =>
                                    selectedCategory === "All"
                                        ? product.category?.toLowerCase() === category.toLowerCase()
                                        : true
                                );

                                if (sectionProducts.length === 0) return null;

                                const categoryIcon =
                                    category === "Coffee"
                                        ? "☕"
                                        : category === "Chai"
                                            ? "🍵"
                                            : "🥐";

                                return (
                                    <section key={category} className="space-y-5">
                                        {/* Section Category Title */}
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-lg shadow-2xs">
                                                {categoryIcon}
                                            </span>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                                                    {category === "Chai" ? "Chai / Tea" : category}
                                                </h2>
                                                <p className="text-xs text-stone-500 font-medium">
                                                    {sectionProducts.length} {sectionProducts.length === 1 ? "delight available" : "delights available"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Products Grid */}
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                            {sectionProducts.map((product) => {
                                                const cartItem = cart.find((item) => item.id === product.id);
                                                const isRecentlyAdded = recentlyAddedId === product.id;

                                                const badgeBg =
                                                    product.category?.toLowerCase() === "chai"
                                                        ? "border-amber-200/80 bg-amber-50 text-amber-800"
                                                        : product.category?.toLowerCase() === "coffee"
                                                            ? "border-orange-200/80 bg-orange-50 text-orange-800"
                                                            : "border-emerald-200/80 bg-emerald-50 text-emerald-800";

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/80 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-950/10"
                                                    >
                                                        {/* Top Image Container */}
                                                        <div>
                                                            <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                                                                {(() => {
                                                                    const img = getItemImage(product);
                                                                    const imgSrc = img?.src || (typeof img === "string" ? img : null);

                                                                    return imgSrc ? (
                                                                        <img
                                                                            src={imgSrc}
                                                                            alt={product.name}
                                                                            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/60 text-5xl">
                                                                            {categoryIcon}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Floating Category Pill */}
                                                                <span className={`absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-xs backdrop-blur-md ${badgeBg}`}>
                                                                    {product.category}
                                                                </span>

                                                                {/* In-Cart Pill */}
                                                                {cartItem && (
                                                                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-md shadow-orange-600/30">
                                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                        <span>{cartItem.quantity} in cart</span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                            <div className="p-4 sm:p-5">
                                                                <h3 className="text-base font-bold text-stone-900 transition-colors group-hover:text-orange-600">
                                                                    {product.name}
                                                                </h3>
                                                                <p className="mt-1 text-xs text-stone-500">
                                                                    Freshly prepared on order
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Price & Action Section */}
                                                        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                                                            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                                                                <div>
                                                                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                                                        Price
                                                                    </span>
                                                                    <span className="text-xl font-extrabold text-stone-900">
                                                                        ₹{Number(product.price).toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                {/* Cart Controls */}
                                                                {cartItem ? (
                                                                    <div className="flex items-center rounded-xl border border-orange-200 bg-orange-50/80 p-1 shadow-2xs">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => decreaseFromCart(product.id)}
                                                                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white font-bold text-orange-700 shadow-2xs transition-all hover:bg-orange-600 hover:text-white active:scale-90"
                                                                            title="Decrease quantity"
                                                                        >
                                                                            −
                                                                        </button>
                                                                        <span className="w-7 text-center text-xs font-black text-orange-950">
                                                                            {cartItem.quantity}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => addToCart(product)}
                                                                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-2xs transition-all hover:bg-orange-700 active:scale-90"
                                                                            title="Increase quantity"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addToCart(product)}
                                                                        className={`group/btn inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${isRecentlyAdded
                                                                            ? "bg-emerald-600 text-white shadow-emerald-500/25"
                                                                            : "bg-orange-600 text-white shadow-orange-500/25 hover:bg-orange-700 hover:shadow-md hover:shadow-orange-500/30"
                                                                            }`}
                                                                    >
                                                                        {isRecentlyAdded ? (
                                                                            <>
                                                                                <span>Added!</span>
                                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span>Add</span>
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-125"
                                                                                    fill="none"
                                                                                    viewBox="0 0 24 24"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth={2.5}
                                                                                >
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                                                </svg>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </main>

                {/* Floating Toast Notification */}
                {toastMessage && (
                    <div
                        className={`fixed ${totalCartItems > 0 ? "bottom-24" : "bottom-6"
                            } right-6 z-50 flex items-center gap-3 rounded-2xl border border-stone-700/50 bg-gray-900/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                            ✓
                        </span>
                        <p className="text-sm font-medium">{toastMessage}</p>
                    </div>
                )}

                {/* Fixed Floating Go To Cart Button (Bottom Right) */}
                {totalCartItems > 0 && (
                    <Link
                        href="/cart"
                        className="fixed bottom-6 right-6 z-40 flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 px-5 py-3.5 text-white shadow-xl shadow-orange-600/35 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-600/45 active:translate-y-0 active:scale-95 group animate-in fade-in slide-in-from-bottom-3"
                    >
                        <div className="relative flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span className="absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-orange-600 shadow-sm">
                                {totalCartItems}
                            </span>
                        </div>

                        <div className="flex flex-col text-left">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-100">
                                {totalCartItems} {totalCartItems === 1 ? "item" : "items"} • ₹{totalCartAmount.toFixed(2)}
                            </span>
                            <span className="text-sm font-bold leading-tight flex items-center gap-1">
                                Go to Cart
                                <svg
                                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                        </div>
                    </Link>
                )}
            </div>
        </ProtectedRoute>
    );
}

export default function ItemsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#faf6f0]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl animate-bounce">
                            ☕
                        </div>
                        <p className="text-xs font-bold text-stone-600">Loading menu...</p>
                    </div>
                </div>
            }
        >
            <ItemsContent />
        </Suspense>
    );
}
