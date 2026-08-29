"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    getDrivingRoute,
    formatDistance,
    formatDuration
} from "@/services/routingService";

const scooterIcon = L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#ea580c;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">🛵</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

const customerIcon = L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#1d4ed8;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">📍</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

/*
 * Keeps both markers in view without jumping the camera on every poll:
 * only refits when the delivery boy or customer falls outside the view.
 */
/*
 * Keeps both markers in view without jumping the camera on every poll:
 * only refits when the delivery boy or customer falls outside the view.
 */
function TrackFollower({ boyPosition, customerPosition }) {
    const map = useMap();
    const boundsRef = useRef(null);

    // Primitive deps so the effect only runs when a coordinate actually changes
    const boyKey = boyPosition ? boyPosition.join(",") : "";
    const customerKey = customerPosition ? customerPosition.join(",") : "";

    useEffect(() => {
        const points = [boyPosition, customerPosition].filter(Boolean);
        if (points.length === 0) return;

        try {
            const bounds = L.latLngBounds(points);

            if (!boundsRef.current) {
                map.fitBounds(bounds.pad(0.35), { animate: false });
                boundsRef.current = bounds;
                return;
            }

            if (!boundsRef.current.pad(-0.05).contains(bounds)) {
                boundsRef.current = boundsRef.current.extend(bounds);
                map.fitBounds(boundsRef.current.pad(0.35));
            }
        } catch {
            // Skip fitting if bounds are invalid (e.g. identical/degenerate points)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boyKey, customerKey, map]);

    return null;
}

/*
 * OrderTrackingMap — used by the customer to follow his delivery.
 * Draws the customer's delivery location (destination) and the delivery
 * boy's live GPS position (from the tracking API), plus the OSRM driving
 * route between them. Shows a staleness warning if the delivery boy's
 * location has not been updated recently.
 *
 * Props:
 *   customerLocation:    { latitude, longitude, address? } | null
 *   deliveryBoyLocation: { latitude, longitude, updatedAt } | null
 */
export default function OrderTrackingMap({
    customerLocation,
    deliveryBoyLocation
}) {
    const [route, setRoute] = useState(null);
    const [routeError, setRouteError] = useState("");
    const [now, setNow] = useState(() => Date.now());

    const customerPosition =
        customerLocation && customerLocation.latitude != null
            ? [
                  Number(customerLocation.latitude),
                  Number(customerLocation.longitude)
              ]
            : null;

    const boyPosition =
        deliveryBoyLocation && deliveryBoyLocation.latitude != null
            ? [
                  Number(deliveryBoyLocation.latitude),
                  Number(deliveryBoyLocation.longitude)
              ]
            : null;

    // Recalculate the driving route whenever either endpoint moves
    useEffect(() => {
        if (!boyPosition || !customerPosition) {
            setRoute(null);
            setRouteError("");
            return;
        }

        let cancelled = false;

        getDrivingRoute(
            boyPosition[0],
            boyPosition[1],
            customerPosition[0],
            customerPosition[1]
        )
            .then((result) => {
                if (cancelled) return;
                setRoute(result);
                setRouteError("");
            })
            .catch((err) => {
                if (cancelled) return;
                setRoute(null);
                setRouteError(
                    err.message === "NO_ROUTE"
                        ? "No driving route found to this location."
                        : ""
                );
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        deliveryBoyLocation?.latitude,
        deliveryBoyLocation?.longitude,
        customerLocation?.latitude,
        customerLocation?.longitude
    ]);

    // Ticker so the stale-location banner stays current while mounted
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    // Stale-location detection (warn when location is >2 min old)
    let staleMinutes = null;
    if (deliveryBoyLocation?.updatedAt) {
        const ageMs = now - new Date(deliveryBoyLocation.updatedAt).getTime();
        if (ageMs > 2 * 60 * 1000) {
            staleMinutes = Math.max(1, Math.round(ageMs / 60000));
        }
    }

    if (!customerPosition) {
        return (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                This order has no delivery location to track.
            </p>
        );
    }

    return (
        <div>
            {route && (
                <div className="mb-3 flex flex-wrap gap-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900">
                    <span>Distance: {formatDistance(route.distance)}</span>
                    <span>Estimated time: {formatDuration(route.duration)}</span>
                </div>
            )}

            {!boyPosition && (
                <p className="mb-3 rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
                    ⏳ Waiting for the delivery boy to start sharing location...
                </p>
            )}

            {boyPosition && staleMinutes != null && (
                <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    ⚠️ Location last updated {staleMinutes} minute
                    {staleMinutes === 1 ? "" : "s"} ago
                </p>
            )}

            {boyPosition && staleMinutes == null && (
                <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    Live — the delivery boy is on the way
                </p>
            )}

            {routeError && (
                <p className="mb-3 rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-500">
                    {routeError}
                </p>
            )}

            <div className="overflow-hidden rounded-xl border border-stone-200">
                <MapContainer
                    center={customerPosition}
                    zoom={14}
                    style={{ height: "340px", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={customerPosition} icon={customerIcon} />
                    {boyPosition && <Marker position={boyPosition} icon={scooterIcon} />}
                    {route && (
                        <Polyline positions={route.coordinates} color="#1d4ed8" weight={5} />
                    )}
                    <TrackFollower
                        boyPosition={boyPosition}
                        customerPosition={customerPosition}
                    />
                </MapContainer>
            </div>
        </div>
    );
}

