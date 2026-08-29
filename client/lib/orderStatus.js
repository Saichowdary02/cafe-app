/*
 * Single source of truth for the 6-step order status flow:
 * ORDER_PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
 */

export const ORDER_STATUS_FLOW = [
    {
        value: "ORDER_PLACED",
        label: "Order Placed",
        icon: "🛒",
        badge: "border-amber-300/80 bg-amber-50 text-amber-800", bar: "bg-amber-500",
        accent: "from-amber-400 to-orange-400",
        circle: "border-amber-500 bg-amber-500 text-white",
        tabActive: "bg-amber-500 text-white shadow-xs",
        tabIdle: "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100",
        statKey: "placed",
    },
    {
        value: "CONFIRMED",
        label: "Order Confirmed",
        icon: "✓",
        badge: "border-lime-300/80 bg-lime-50 text-lime-800", bar: "bg-lime-600",
        accent: "from-lime-400 to-green-500",
        circle: "border-lime-600 bg-lime-600 text-white",
        tabActive: "bg-lime-600 text-white shadow-xs",
        tabIdle: "bg-lime-50 text-lime-800 border border-lime-200/60 hover:bg-lime-100",
        statKey: "confirmed",
    },
    {
        value: "PREPARING",
        label: "Preparing",
        icon: "👨‍🍳",
        badge: "border-blue-300/80 bg-blue-50 text-blue-800", bar: "bg-blue-500",
        accent: "from-blue-400 to-indigo-500",
        circle: "border-blue-500 bg-blue-500 text-white",
        tabActive: "bg-blue-600 text-white shadow-xs",
        tabIdle: "bg-blue-50 text-blue-800 border border-blue-200/60 hover:bg-blue-100",
        statKey: "preparing",
    },
    {
        value: "READY_FOR_PICKUP",
        label: "Ready for Pickup",
        icon: "📦",
        badge: "border-violet-300/80 bg-violet-50 text-violet-800", bar: "bg-violet-500",
        accent: "from-violet-400 to-purple-500",
        circle: "border-violet-500 bg-violet-500 text-white",
        tabActive: "bg-violet-600 text-white shadow-xs",
        tabIdle: "bg-violet-50 text-violet-800 border border-violet-200/60 hover:bg-violet-100",
        statKey: "ready",
    },
    {
        value: "OUT_FOR_DELIVERY",
        label: "Out for Delivery",
        icon: "🛵",
        badge: "border-orange-300/80 bg-orange-50 text-orange-800", bar: "bg-orange-500",
        accent: "from-orange-400 to-red-500",
        circle: "border-orange-500 bg-orange-500 text-white",
        tabActive: "bg-orange-600 text-white shadow-xs",
        tabIdle: "bg-orange-50 text-orange-800 border border-orange-200/60 hover:bg-orange-100",
        statKey: "out",
    },
    {
        value: "DELIVERED",
        label: "Delivered",
        icon: "✅",
        badge: "border-emerald-300/80 bg-emerald-50 text-emerald-800", bar: "bg-emerald-500",
        accent: "from-emerald-400 to-teal-500",
        circle: "border-emerald-500 bg-emerald-500 text-white",
        tabActive: "bg-emerald-600 text-white shadow-xs",
        tabIdle: "bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100",
        statKey: "delivered",
    },
];

export const ORDER_STATUS_CONFIG = Object.fromEntries(
    ORDER_STATUS_FLOW.map((s) => [s.value, s])
);

// Strict next step in the flow (null for the final status)
export const NEXT_ORDER_STATUS = {
    ORDER_PLACED: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "READY_FOR_PICKUP",
    READY_FOR_PICKUP: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
};

