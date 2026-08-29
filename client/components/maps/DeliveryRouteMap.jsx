"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
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
 * DeliveryRouteMap — used by the delivery boy.
 * Gets the delivery boy's current GPS position, asks the routing service
 * (OSRM) for a driving route to the customer's delivery location, and
 * draws the road-following route with distance + ETA.
 *
 * Props: destination: { latitude, longitude, address }
 */
export default function DeliveryRouteMap({ destination }) {
    const [route, setRoute] = useState(null);
    const [myPosition, setMyPosition] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        if (
            !destination ||
            destination.latitude === null ||
            destination.latitude === undefined
        ) {
            setError("This order has no delivery location.");
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                // 1. Delivery boy's current location from the browser
                const position = await new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error("GEO_UNSUPPORTED"));
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        (pos) =>
                            resolve({
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude
                            }),
                        () => reject(new Error("GEO_DENIED")),
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                });

                if (cancelled) return;
                setMyPosition([position.lat, position.lng]);

                // 2. Driving route (OSRM, best/fastest driving profile)
                const result = await getDrivingRoute(
                    position.lat,
                    position.lng,
                    Number(destination.latitude),
                    Number(destination.longitude)
                );

                if (cancelled) return;
                setRoute(result);
            } catch (err) {
                if (cancelled) return;
                if (err.message === "GEO_DENIED") {
                    setError("Location permission was denied. Enable location access to see the route.");
                } else if (err.message === "GEO_UNSUPPORTED") {
                    setError("Geolocation is not supported by your browser.");
                } else if (err.message === "NO_ROUTE") {
                    setError("No driving route could be found for this location.");
                } else {
                    setError("Unable to calculate the route right now. Please try again.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [destination?.latitude, destination?.longitude]);

    const center =
        myPosition ||
        (destination
            ? [Number(destination.latitude), Number(destination.longitude)]
            : [17.385044, 78.486671]);

    return (
        <div>
            {loading && (
                <p className="mb-2 text-xs font-semibold text-stone-500">
                    Getting your location and calculating route...
                </p>
            )}

            {error && (
                <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {error}
                </p>
            )}

            {route && !error && (
                <div className="mb-3 flex flex-wrap gap-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900">
                    <span>Distance: {formatDistance(route.distance)}</span>
                    <span>Estimated time: {formatDuration(route.duration)}</span>
                    <span className="self-center text-[10px] font-medium text-emerald-700">
                        (No live traffic)
                    </span>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-stone-200">
                <MapContainer
                    center={center}
                    zoom={14}
                    style={{ height: "380px", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {myPosition && <Marker position={myPosition} icon={scooterIcon} />}
                    {destination && destination.latitude != null && (
                        <Marker
                            position={[
                                Number(destination.latitude),
                                Number(destination.longitude)
                            ]}
                            icon={customerIcon}
                        />
                    )}
                    {route && (
                        <Polyline positions={route.coordinates} color="#ea580c" weight={5} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
