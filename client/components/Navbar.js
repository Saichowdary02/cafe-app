"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
         localStorage.removeItem("cart"); 

        router.push("/login");
    };

    return (
        <header className="border-b bg-white">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

                <Link
                    href="/home"
                    className="text-xl font-bold"
                >
                    ☕ Cafe App
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

                    <button
                        onClick={handleLogout}
                        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                    >
                        Logout
                    </button>

                </nav>

            </div>
        </header>
    );
}