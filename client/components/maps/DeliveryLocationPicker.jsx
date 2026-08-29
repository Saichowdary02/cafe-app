"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default map center — only used until a location is picked
const DEFAULT_CENTER = [17.385044, 78.486671];

// Fix Leaflet's default marker icon paths under bundlers
const pinIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

/* Reverse geocode coordinates into a readable address (Nominatim / OSM). */
async function reverseGeocode(latitude, longitude) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.display_name || null;
    } catch {
        return null;
    }
}

/* Captures map clicks to set the selected location. */
function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
}

/* Moves the map view when the selected position changes. */
function Recenter({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, Math.max(map.getZoom(), 15));
    }, [position, map]);
    return null;
}

export { pinIcon };

/*
 * DeliveryLocationPicker — used by the customer at checkout.
 * Click the map OR use current location, then confirm.
 * Calls onConfirm({ latitude, longitude, address }).
 */
export default function DeliveryLocationPicker({ onConfirm, onCancel, confirming }) {
    const [selected, setSelected] = useState(null);
    const [locating, setLocating] = useState(false);
    const [geoError, setGeoError] = useState("");

    const pick = async (lat, lng) => {
        setSelected({ lat, lng, address: null });
        setGeoError("");
        const address = await reverseGeocode(lat, lng);
        setSelected((prev) =>
            prev && prev.lat === lat && prev.lng === lng
                ? { ...prev, address }
                : prev
        );
    };

    const handleUseCurrentLocation = () => {
        setGeoError("");
        if (!navigator.geolocation) {
            setGeoError("Geolocation is not supported by your browser.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                pick(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                setLocating(false);
                setGeoError(
                    "Location permission was denied. Please select your delivery location manually on the map."
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleConfirm = () => {
        if (!selected) return;
        onConfirm({
            latitude: selected.lat,
            longitude: selected.lng,
            address: selected.address
        });
    };

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Delivery Location</h3>
            <p className="mt-1 text-xs font-medium text-stone-500">
                Click on the map or use your current location.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={13}
                    style={{ height: "320px", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onPick={pick} />
                    <Recenter position={selected ? [selected.lat, selected.lng] : null} />
                    {selected && (
                        <Marker position={[selected.lat, selected.lng]} icon={pinIcon} />
                    )}
                </MapContainer>
            </div>

            {selected && (
                <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs font-medium text-stone-700">
                    <p><span className="font-bold">Latitude:</span> {selected.lat.toFixed(6)}</p>
                    <p><span className="font-bold">Longitude:</span> {selected.lng.toFixed(6)}</p>
                    {selected.address && (
                        <p className="mt-1"><span className="font-bold">Address:</span> {selected.address}</p>
                    )}
                </div>
            )}

            {geoError && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {geoError}
                </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="flex-1 cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                >
                    {locating ? "Getting location..." : "Use My Current Location"}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selected || confirming}
                    className="flex-1 cursor-pointer rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Confirm Location
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-50"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
