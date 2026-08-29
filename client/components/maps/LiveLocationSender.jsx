"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Minimum gap between two location POSTs (~10 sec per the tracking plan)
const SEND_INTERVAL_MS = 10000;

/*
 * LiveLocationSender — rendered on the delivery boy's page.
 * When `active` is true (he has an order OUT_FOR_DELIVERY), it watches
 * his GPS position and throttled-POSTs it to the backend every ~10 sec.
 * The backend identifies him from the JWT; no boy-supplied ID is sent.
 *
 * Props:
 *   active: boolean — true while an assigned order is OUT_FOR_DELIVERY
 */
export default function LiveLocationSender({ active }) {
    const [status, setStatus] = useState("idle"); // idle | sharing | denied | unsupported
    const [sentCount, setSentCount] = useState(0);
    const lastSentAtRef = useRef(0);
    const watchIdRef = useRef(null);

    useEffect(() => {
        const stopWatch = () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };

        if (!active) {
            stopWatch();
            setStatus("idle");
            return;
        }

        if (!navigator.geolocation) {
            setStatus("unsupported");
            return;
        }

        const sendLocation = (latitude, longitude) => {
            const now = Date.now();
            if (now - lastSentAtRef.current < SEND_INTERVAL_MS) return;
            lastSentAtRef.current = now;

            // Failures are silent — the next GPS fix will retry
            fetch(`${API_URL}/api/delivery/location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ latitude, longitude })
            })
                .then((res) => {
                    if (res.ok) setSentCount((c) => c + 1);
                })
                .catch(() => {});
        };

        setStatus("sharing");
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
            () => setStatus("denied"),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );

        return stopWatch;
    }, [active]);

    if (!active || status === "idle") return null;

    if (status === "unsupported") {
        return (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                ⚠️ Live location sharing is not supported by this browser.
            </div>
        );
    }

    if (status === "denied") {
        return (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                ⚠️ Location permission denied — the customer cannot track your
                delivery. Enable location access to share your live position.
            </div>
        );
    }

    return (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            📍 Live location sharing: ON
            {sentCount > 0 && (
                <span className="font-medium text-emerald-600">
                    · {sentCount} update{sentCount === 1 ? "" : "s"} sent
                </span>
            )}
        </div>
    );
}
