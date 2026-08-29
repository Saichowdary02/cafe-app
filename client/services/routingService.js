/*
 * Routing service — keeps OSRM (Open Source Routing Machine) integration
 * separate from UI components so the provider can be swapped later.
 *
 * Public OSRM demo server (driving profile, fastest route by default).
 */
const OSRM_BASE_URL =
    process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org";

/**
 * Get a driving route between two coordinates.
 * @param {number} startLatitude
 * @param {number} startLongitude
 * @param {number} endLatitude
 * @param {number} endLongitude
 * @returns {Promise<{distance: number, duration: number, coordinates: Array<[number, number]>}>}
 *   distance in meters, duration in seconds, coordinates as [lat, lng].
 */
export async function getDrivingRoute(
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude
) {
    const url =
        `${OSRM_BASE_URL}/route/v1/driving/` +
        `${startLongitude},${startLatitude};${endLongitude},${endLatitude}` +
        `?overview=full&geometries=geojson`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error("ROUTING_UNAVAILABLE");
    }

    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("NO_ROUTE");
    }

    const route = data.routes[0];

    return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        coordinates: route.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] // Leaflet expects [lat, lng]
        )
    };
}

/** Format meters as a readable distance string. */
export function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

/** Format seconds as a readable ETA string. */
export function formatDuration(seconds) {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    return `${hours} h ${mins % 60} min`;
}
