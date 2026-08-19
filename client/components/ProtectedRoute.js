"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children, allowedRoles }) {

    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [authorized, setAuthorized] = useState(true);


    useEffect(() => {

        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token) {

            router.replace("/login");

            return;
        }


        setAuthenticated(true);


        // Role check — only runs if this page restricts roles
        if (allowedRoles && allowedRoles.length > 0) {

            try {

                const user = userData ? JSON.parse(userData) : null;

                if (!user || !allowedRoles.includes(user.role)) {
                    setAuthorized(false);
                }

            } catch (error) {

                console.error(error);

                setAuthorized(false);

            }

        }


        setChecking(false);

    }, [router, allowedRoles]);


    if (checking) {

        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Checking authentication...</p>
            </div>
        );
    }


    if (!authenticated) {
        return null;
    }


    if (!authorized) {

        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">

                <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
                        🚫
                    </div>

                    <h1 className="mt-5 text-2xl font-bold text-gray-900">
                        Access Denied
                    </h1>

                    <p className="mt-2 text-gray-600">
                        You don&apos;t have permission to view this page.
                    </p>

                </div>

            </div>
        );
    }


    return children;
}