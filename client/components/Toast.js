"use client";

export default function Toast({ message, type = "success", onClose, position = "top-6 right-6", className = "" }) {
    if (!message) return null;

    const isSuccess = type === "success";

    return (
        <div
            role="alert"
            className={`fixed ${position} z-[60] flex items-center gap-3 rounded-2xl border border-stone-700/50 bg-gray-900/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${className}`}
        >
            <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isSuccess ? "bg-emerald-500" : "bg-red-500"
                }`}
            >
                {isSuccess ? "✓" : "✕"}
            </span>

            <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-white">
                    {isSuccess ? "Success" : "Error"}
                </span>
                <span className="text-xs text-stone-300 font-medium">
                    {message}
                </span>
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-2 text-stone-400 hover:text-white transition text-xs cursor-pointer p-1"
                    aria-label="Close notification"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
