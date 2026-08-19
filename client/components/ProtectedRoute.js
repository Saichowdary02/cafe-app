"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {

    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);


    useEffect(() => {

        const token = localStorage.getItem("token");

        if (!token) {

            router.replace("/login");

            return;
        }


        setAuthenticated(true);
        setChecking(false);

    }, [router]);


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


    return children;
}