"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);


    const handleLogin = async (e) => {

        e.preventDefault();

        setMessage("");
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

                setMessage(
                    data.message || "Invalid email or password"
                );

                setLoading(false);

                return;
            }


            /*
             * Store JWT
             */

            localStorage.setItem(
                "token",
                data.token
            );


            /*
             * Store user information
             */

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );


            setMessage("Login successful!");


            /*
             * Go to Home
             */

            setTimeout(() => {

                router.push("/home");

            }, 500);


        } catch (error) {

            console.error(error);

            setMessage(
                "Unable to connect to server."
            );

        } finally {

            setLoading(false);

        }
    };


    return (

        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">

            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">

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
                            className="mb-2 block font-medium"
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
                            className="w-full rounded-md border px-3 py-2 outline-none focus:border-orange-500"
                        />

                    </div>


                    {/* Password */}

                    <div>

                        <label
                            htmlFor="password"
                            className="mb-2 block font-medium"
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
                            className="w-full rounded-md border px-3 py-2 outline-none focus:border-orange-500"
                        />

                    </div>


                    {/* Message */}

                    {message && (

                        <p className="text-center text-sm">
                            {message}
                        </p>

                    )}


                    {/* Login button */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
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
                        className="ml-1 font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Create account
                    </button>

                </p>

            </div>

        </main>

    );
}