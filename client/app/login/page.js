"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import AuthHeader from "@/components/AuthHeader";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 3500);
    };

    const handleLogin = async (e) => {

        e.preventDefault();
        setLoading(true);

        try {

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Invalid email or password", "error");
                setLoading(false);
                return;
            }

            /*
             * Store JWT
             */
            localStorage.setItem("token", data.token);

            /*
             * Store user information
             */
            localStorage.setItem("user", JSON.stringify(data.user));

            showToast("Login successful!", "success");

            /*
             * Go to Home after short delay to view toast
             */
            setTimeout(() => {
                router.push("/home");
            }, 1000);

        } catch (error) {
            console.error(error);
            showToast("Unable to connect to server.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (

        <main className="relative flex min-h-screen items-center justify-center px-4 pb-6 pt-24">
            {/* Top Navbar */}
            <AuthHeader />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-xl shadow-amber-900/5 backdrop-blur-sm sm:p-8">

                {/* Centered Logo Badge — same as navbar logo */}
                <div className="mb-3 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-100">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7"
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
                </div>

                {/* Centered Heading */}
                <div className="mb-5 text-center">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">
                        Welcome Back
                    </h1>
                    <p className="mt-1 text-sm text-stone-500">
                        Sign in to your Cafe App account
                    </p>
                </div>

                <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                >

                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-1.5 block text-sm font-semibold text-stone-700"
                        >
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                            required
                            className="w-full rounded-xl border border-stone-200 px-4 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1.5 block text-sm font-semibold text-stone-700"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter your password"
                                required
                                className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-11 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                title={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-stone-400 transition hover:bg-orange-50 hover:text-orange-600"
                            >
                                {showPassword ? (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.585 10.587a2 2 0 002.828 2.828M9.878 5.11A9.955 9.955 0 0112 4.86c4.6 0 8.56 2.85 10.14 6.86a10.03 10.03 0 01-2.31 3.52m-3.06 1.68a9.96 9.96 0 01-4.77 1.22c-4.6 0-8.56-2.85-10.14-6.86a10.04 10.04 0 013.44-4.44" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 8-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Login button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full cursor-pointer rounded-xl bg-orange-600 py-2.5 font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50"
                    >
                        {loading
                            ? "Signing In..."
                            : "Sign In"
                        }
                    </button>

                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Don&apos;t have an account?
                    <button
                        onClick={() => router.push("/register")}
                        className="ml-1 cursor-pointer font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Sign up here
                    </button>
                </p>

                {/* Info Panel */}
                <div className="mt-4 rounded-2xl border border-orange-100 bg-linear-to-br from-amber-50 to-orange-50/60 p-4">
                    <p className="text-sm font-bold text-stone-800">
                        Cafe Experience
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-stone-600">
                        <li>• Order fresh chai, coffee &amp; snacks online</li>
                        <li>• Pay by cash or online (UPI / cards)</li>
                        <li>• Track your order live from kitchen to table</li>
                    </ul>
                </div>

            </div>

        </main>

    );
}