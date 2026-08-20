"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

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

        <main className="relative flex min-h-screen items-center justify-center px-4">

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Top-left Brand Logo & Name */}
            <div className="absolute top-6 left-6">
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
            </div>

            <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white/95 p-8 shadow-xl shadow-amber-900/5 backdrop-blur-sm">

                <h1 className="mb-2 text-3xl font-bold">
                    Login
                </h1>

                <p className="mb-6 text-gray-600">
                    Login to your Cafe App account
                </p>

                <form
                    onSubmit={handleLogin}
                    className="space-y-5"
                >

                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block font-medium text-stone-700"
                        >
                            Email
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
                            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block font-medium text-stone-700"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter your password"
                            required
                            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    {/* Login button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full cursor-pointer rounded-xl bg-orange-600 py-3 font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50"
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"
                        }
                    </button>

                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?
                    <button
                        onClick={() => router.push("/register")}
                        className="ml-1 cursor-pointer font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Create account
                    </button>
                </p>

            </div>

        </main>

    );
}