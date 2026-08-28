"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthHeader() {
    const pathname = usePathname();

    const getLinkClasses = (href) => {
        const isActive = pathname === href;

        if (isActive) {
            return "inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/35 active:scale-95";
        }

        return "inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2 text-sm font-bold text-stone-700 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 hover:shadow-md hover:shadow-orange-500/15 active:scale-95";
    };

    return (
        <header className="absolute top-0 left-0 w-full border-b border-stone-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
                <Link
                    href="/login"
                    className="flex items-center gap-2.5 text-gray-900 group"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-500/20 group-hover:bg-orange-700 transition">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
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

                <div className="flex items-center gap-3">
                    <Link href="/login" className={getLinkClasses("/login")}>
                        Login
                    </Link>
                    <Link
                        href="/register"
                        className={getLinkClasses("/register")}
                    >
                        Sign Up
                    </Link>
                </div>
            </nav>
        </header>
    );
}
