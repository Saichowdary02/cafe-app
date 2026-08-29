/*
 * Tracking service — API calls for the customer's "Track Delivery" view.
 * Kept separate from UI components so the endpoint can evolve later.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Poll the tracking snapshot for an order.
 * @param {number|string} orderId
 * @param {string} token - JWT of the logged-in customer
 * @returns {Promise<{orderId:number, status:string, deliveryBoyId:number|null,
 *   customerLocation:{latitude:number, longitude:number}|null,
 *   deliveryBoyLocation:{latitude:number, longitude:number, updatedAt:string}|null}>}
 */
export async function getTracking(orderId, token) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch tracking data");
    }

    return data.tracking;
}
