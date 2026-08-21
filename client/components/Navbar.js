"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Toast from "@/components/Toast";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState(null);
    const [toast, setToast] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 8);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error(error);
            }
        }
    }, []);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        setProfileOpen(false);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("cart");

        setToast({
            message: "Successfully logged out!",
            type: "success"
        });

        setTimeout(() => {
            router.push("/login");
        }, 900);
    };

    const isAdmin = user?.role === "ADMIN";

    const isActive = (path) => {
        if (path === "/home") return pathname === "/home" || pathname === "/";
        return pathname?.startsWith(path);
    };

    return (
        <>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    position="top-20 right-6"
                    onClose={() => setToast(null)}
                />
            )}
            <header
                className={`sticky top-0 z-50 w-full transition-all duration-300 ${
                    isScrolled
                        ? "border-b border-stone-200/90 bg-white/95 shadow-md shadow-stone-900/5 backdrop-blur-md"
                        : "border-b border-amber-900/10 bg-white/85 backdrop-blur-md"
                }`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Brand Logo */}
                    <Link
                        href="/home"
                        className="flex items-center gap-2.5 text-gray-900 group"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-500/20 group-hover:bg-orange-700 transition">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 1v3M10 1v3M14 1v3"
                                />
                            </svg>
                        </div>
                        <span className="text-xl font-black tracking-tight text-gray-900">
                            Cafe App
                        </span>
                    </Link>

                    {/* Navigation Links & Profile */}
                    <nav className="flex  items-center gap-2 sm:gap-4">
                        <Link
                            href="/home"
                            className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                isActive("/home")
                                    ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                    : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                            }`}
                        >
                            <span>Home</span>
                            {isActive("/home") && (
                                <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                            )}
                        </Link>

                        <Link
                            href="/items"
                            className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                isActive("/items")
                                    ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                    : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                            }`}
                        >
                            <span>Items</span>
                            {isActive("/items") && (
                                <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                            )}
                        </Link>

                        <Link
                            href="/cart"
                            className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                isActive("/cart")
                                    ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                    : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                            }`}
                        >
                            <span>Cart</span>
                            {isActive("/cart") && (
                                <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                            )}
                        </Link>

                        <Link
                            href="/orders"
                            className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                isActive("/orders")
                                    ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                    : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                            }`}
                        >
                            <span>Orders</span>
                            {isActive("/orders") && (
                                <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                            )}
                        </Link>

                        {/* ADMIN ONLY */}
                        {isAdmin && (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                        isActive("/dashboard")
                                            ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                            : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                                    }`}
                                >
                                    <span>Dashboard</span>
                                    {isActive("/dashboard") && (
                                        <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                                    )}
                                </Link>

                                <Link
                                    href="/manage-products"
                                    className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                        isActive("/manage-products")
                                            ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                            : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                                    }`}
                                >
                                    <span>Manage Products</span>
                                    {isActive("/manage-products") && (
                                        <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                                    )}
                                </Link>

                                <Link
                                    href="/staff"
                                    className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                        isActive("/staff")
                                            ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                            : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                                    }`}
                                >
                                    <span>Staff</span>
                                    {isActive("/staff") && (
                                        <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                                    )}
                                </Link>

                                <Link
                                    href="/manage-billing"
                                    className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-150 ${
                                        isActive("/manage-billing")
                                            ? "bg-orange-50 font-bold text-orange-600 shadow-2xs"
                                            : "text-stone-600 hover:bg-stone-100/80 hover:text-orange-600"
                                    }`}
                                >
                                    <span className="text-xs">⚙️</span>
                                    <span>Bill Settings</span>
                                    {isActive("/manage-billing") && (
                                        <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-orange-600" />
                                    )}
                                </Link>
                            </>
                        )}

                        {/* Profile Button & Dropdown */}
                        {user ? (
                            <div className="relative ml-2" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen((prev) => !prev)}
                                    className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-200/90 bg-stone-50/80 p-1 pr-2.5 transition-all hover:border-orange-300 hover:bg-orange-50/60 focus:outline-hidden active:scale-95"
                                    title="User Profile"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-xs font-black text-white shadow-xs">
                                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <span className="hidden max-w-[100px] truncate text-xs font-bold text-stone-800 sm:inline-block">
                                        {user.name}
                                    </span>
                                    <svg
                                        className={`h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${
                                            profileOpen ? "rotate-180 text-orange-600" : ""
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {profileOpen && (
                                    <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 z-50">
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-sm font-black text-white shadow-xs">
                                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="truncate text-sm font-bold text-gray-900">
                                                        {user.name}
                                                    </p>
                                                    {user.role && user.role !== "USER" && (
                                                        <span className="rounded-md bg-orange-100 px-1.5 py-0.2 text-[9px] font-extrabold text-orange-800 uppercase">
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="truncate text-xs text-stone-500 font-medium">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Admin Quick Menu */}
                                        {isAdmin && (
                                            <div className="py-2 border-b border-stone-100 space-y-1">
                                                <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                                                    Admin Controls
                                                </p>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                                                >
                                                    <span>📊</span>
                                                    <span>Dashboard</span>
                                                </Link>
                                                <Link
                                                    href="/manage-products"
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                                                >
                                                    <span>📦</span>
                                                    <span>Manage Products</span>
                                                </Link>
                                                <Link
                                                    href="/staff"
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                                                >
                                                    <span>👥</span>
                                                    <span>Staff Management</span>
                                                </Link>
                                                <Link
                                                    href="/manage-billing"
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                                                >
                                                    <span>⚙️</span>
                                                    <span>Bill & Tax Settings</span>
                                                </Link>
                                            </div>
                                        )}

                                        {/* Logout Action */}
                                        <div className="pt-3">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white active:scale-95 shadow-2xs"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                    />
                                                </svg>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </nav>
                </div>
            </header>
        </>
    );
}