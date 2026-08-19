"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const router = useRouter();

    const [user, setUser] = useState(null);

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


    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("cart");

        router.push("/login");
    };


    const isAdmin = user?.role === "ADMIN";


    return (
        <header className="sticky top-0 z-50 border-b border-amber-900/10 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

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
                    <span className="text-xl font-bold tracking-tight text-gray-900">
                        Cafe App
                    </span>
                </Link>

                <nav className="flex items-center gap-6">

                    <Link
                        href="/home"
                        className="text-gray-700 hover:text-orange-600"
                    >
                        Home
                    </Link>

                    <Link
                        href="/items"
                        className="text-gray-700 hover:text-orange-600"
                    >
                        Items
                    </Link>

                    <Link
                        href="/orders"
                        className="text-gray-700 hover:text-orange-600"
                    >
                        Orders
                    </Link>

                    <Link
                        href="/cart"
                        className="text-gray-700 hover:text-orange-600"
                    >
                        Cart
                    </Link>

                    {/* ADMIN ONLY */}
                    {isAdmin && (
                        <Link
                            href="/manage-products"
                            className="text-gray-700 hover:text-orange-600"
                        >
                            Manage Products
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-md hover:shadow-red-500/20 active:translate-y-0 active:scale-95"
                    >
                        <span>Logout</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
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
                    </button>

                </nav>

            </div>
        </header>
    );
}