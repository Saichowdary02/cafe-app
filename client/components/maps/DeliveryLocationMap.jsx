"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { pinIcon } from "./DeliveryLocationPicker";

/*
 * DeliveryLocationMap — used by admin/staff (and the customer's order
 * history) to display where an order should be delivered.
 * Props: latitude, longitude, address (optional), height (default 240px).
 */
export default function DeliveryLocationMap({
    latitude,
    longitude,
    address,
    height = 240
}) {
    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
    ) {
        return (
            <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500">
                No delivery location was selected for this order.
            </p>
        );
    }

    const position = [Number(latitude), Number(longitude)];

    return (
        <div>
            <div className="overflow-hidden rounded-xl border border-stone-200">
                <MapContainer
                    center={position}
                    zoom={16}
                    style={{ height, width: "100%" }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position} icon={pinIcon} />
                </MapContainer>
            </div>
            <div className="mt-2 text-xs font-medium text-stone-600">
                <p><span className="font-bold">Latitude:</span> {Number(latitude).toFixed(6)}</p>
                <p><span className="font-bold">Longitude:</span> {Number(longitude).toFixed(6)}</p>
                {address && <p><span className="font-bold">Address:</span> {address}</p>}
            </div>
        </div>
    );
}
