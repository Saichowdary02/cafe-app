"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Toast from "@/components/Toast";
import { calculateBillBreakdown, DEFAULT_BILL_SETTINGS } from "@/lib/billCalculator";

export default function ManageBillingPage() {
    const [billingSettings, setBillingSettings] = useState(DEFAULT_BILL_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [testSubtotal, setTestSubtotal] = useState(200);

    // Fetch current bill settings from server
    const fetchSettings = async () => {
        try {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const response = await fetch(`${apiUrl}/api/bill/settings`);

            if (!response.ok) {
                throw new Error("Failed to fetch billing settings");
            }

            const data = await response.json();
            if (data.settings) {
                setBillingSettings({
                    packaging_fee_percent: Number(data.settings.packaging_fee_percent),
                    platform_fee: Number(data.settings.platform_fee),
                    cgst_percent: Number(data.settings.cgst_percent),
                    sgst_percent: Number(data.settings.sgst_percent),
                    platform_fee_gst_percent: Number(data.settings.platform_fee_gst_percent),
                });
            }
        } catch (err) {
            console.error(err);
            setToast({
                message: err.message || "Failed to load bill settings",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Save updated bill settings
    const handleSave = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            const token = localStorage.getItem("token");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

            const response = await fetch(`${apiUrl}/api/bill/settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    packaging_fee_percent: Number(billingSettings.packaging_fee_percent),
                    platform_fee: Number(billingSettings.platform_fee),
                    cgst_percent: Number(billingSettings.cgst_percent),
                    sgst_percent: Number(billingSettings.sgst_percent),
                    platform_fee_gst_percent: Number(billingSettings.platform_fee_gst_percent),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to save bill settings");
            }

            setToast({
                message: "Bill & Tax Settings saved successfully! Live orders now use these rates.",
                type: "success",
            });

            if (data.settings) {
                setBillingSettings({
                    packaging_fee_percent: Number(data.settings.packaging_fee_percent),
                    platform_fee: Number(data.settings.platform_fee),
                    cgst_percent: Number(data.settings.cgst_percent),
                    sgst_percent: Number(data.settings.sgst_percent),
                    platform_fee_gst_percent: Number(data.settings.platform_fee_gst_percent),
                });
            }
        } catch (err) {
            console.error(err);
            setToast({
                message: err.message || "Failed to save bill settings",
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    // Live preview calculations based on current inputs
    const testBreakdown = calculateBillBreakdown(testSubtotal, billingSettings);

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="min-h-screen pb-16">
                <Navbar />

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        position="top-20 right-6"
                        onClose={() => setToast(null)}
                    />
                )}

                <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
                    {/* Header */}
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                <span>🔒 Admin Only</span>
                            </div>
                            <h1 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
                                Bill & Tax Settings
                            </h1>
                            <p className="mt-1.5 text-sm text-stone-600">
                                Configure packaging fee, platform fee, CGST, SGST, and Platform Fee GST. Customer cart and checkout automatically calculate using these active parameters.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={fetchSettings}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Refreshing..." : "↻ Refresh"}
                            </button>
                            <Link
                                href="/manage-products"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95"
                            >
                                <span>Manage Products →</span>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* Settings Form */}
                        <div className="lg:col-span-6 space-y-6">
                            <form onSubmit={handleSave} className="rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-xl shadow-amber-950/5 backdrop-blur-md sm:p-7">
                                <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
                                    Fee & GST Parameters
                                </h2>

                                <div className="mt-5 space-y-4">
                                    {/* Packaging Fee (%) */}
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition focus-within:border-orange-400 focus-within:bg-orange-50/20">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                            Packaging Fee (%)
                                        </label>
                                        <p className="mt-0.5 text-[11px] text-stone-500">
                                            Calculated as % of food & beverage subtotal (e.g. 5.0%)
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={billingSettings.packaging_fee_percent}
                                                onChange={(e) =>
                                                    setBillingSettings({
                                                        ...billingSettings,
                                                        packaging_fee_percent: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900 shadow-inner focus:border-orange-500 focus:outline-hidden"
                                                required
                                            />
                                            <span className="font-extrabold text-stone-500">%</span>
                                        </div>
                                    </div>

                                    {/* Platform Fee (Flat Rs) */}
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition focus-within:border-orange-400 focus-within:bg-orange-50/20">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                            Platform Fee (₹ Flat)
                                        </label>
                                        <p className="mt-0.5 text-[11px] text-stone-500">
                                            Fixed app convenience charge per order (e.g. ₹5.00)
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <span className="font-extrabold text-stone-500">₹</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={billingSettings.platform_fee}
                                                onChange={(e) =>
                                                    setBillingSettings({
                                                        ...billingSettings,
                                                        platform_fee: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900 shadow-inner focus:border-orange-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* CGST & SGST Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* CGST % */}
                                        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition focus-within:border-orange-400 focus-within:bg-orange-50/20">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                                CGST (%)
                                            </label>
                                            <p className="mt-0.5 text-[11px] text-stone-500">
                                                On (Subtotal + Packaging)
                                            </p>
                                            <div className="mt-2.5 flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={billingSettings.cgst_percent}
                                                    onChange={(e) =>
                                                        setBillingSettings({
                                                            ...billingSettings,
                                                            cgst_percent: e.target.value,
                                                        })
                                                    }
                                                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-900 shadow-inner focus:border-orange-500 focus:outline-hidden"
                                                    required
                                                />
                                                <span className="font-extrabold text-stone-500">%</span>
                                            </div>
                                        </div>

                                        {/* SGST % */}
                                        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition focus-within:border-orange-400 focus-within:bg-orange-50/20">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                                SGST (%)
                                            </label>
                                            <p className="mt-0.5 text-[11px] text-stone-500">
                                                On (Subtotal + Packaging)
                                            </p>
                                            <div className="mt-2.5 flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={billingSettings.sgst_percent}
                                                    onChange={(e) =>
                                                        setBillingSettings({
                                                            ...billingSettings,
                                                            sgst_percent: e.target.value,
                                                        })
                                                    }
                                                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-900 shadow-inner focus:border-orange-500 focus:outline-hidden"
                                                    required
                                                />
                                                <span className="font-extrabold text-stone-500">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GST on Platform Fee (%) */}
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 transition focus-within:border-orange-400 focus-within:bg-orange-50/20">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                            GST on Platform Fee (%)
                                        </label>
                                        <p className="mt-0.5 text-[11px] text-stone-500">
                                            Tax rate applied exclusively on platform fee (e.g. 18.0%)
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={billingSettings.platform_fee_gst_percent}
                                                onChange={(e) =>
                                                    setBillingSettings({
                                                        ...billingSettings,
                                                        platform_fee_gst_percent: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900 shadow-inner focus:border-orange-500 focus:outline-hidden"
                                                required
                                            />
                                            <span className="font-extrabold text-stone-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 cursor-pointer rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-600/35 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Bill Settings"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBillingSettings(DEFAULT_BILL_SETTINGS)}
                                        className="cursor-pointer rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-xs font-bold text-stone-700 hover:bg-stone-50 active:scale-95"
                                    >
                                        Reset Defaults
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Live Calculation Table Preview */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-xl shadow-amber-950/5 backdrop-blur-md sm:p-7">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-900">
                                            Live Formula Simulator
                                        </h3>
                                        <p className="text-xs text-stone-500">
                                            Real-time bill breakdown calculated with your settings.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-stone-600">Sample Subtotal: ₹</span>
                                        <input
                                            type="number"
                                            value={testSubtotal}
                                            onChange={(e) => setTestSubtotal(Math.max(0, Number(e.target.value) || 0))}
                                            className="w-24 rounded-xl border border-stone-300 px-3 py-1 text-xs font-bold text-stone-900 text-right focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead>
                                            <tr className="border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                                                <th className="py-2.5">Line Item</th>
                                                <th className="py-2.5">Base / Rate</th>
                                                <th className="py-2.5">Calculation</th>
                                                <th className="py-2.5 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 text-stone-700">
                                            <tr>
                                                <td className="py-2.5 font-bold text-stone-900">Subtotal (Food & Snacks)</td>
                                                <td className="py-2.5 text-stone-500">Base item price</td>
                                                <td className="py-2.5 text-stone-400">—</td>
                                                <td className="py-2.5 text-right font-bold text-stone-900">₹{testBreakdown.subtotal.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">Packaging Fee</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.packaging_fee_percent}%</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.subtotal.toFixed(2)} &times; {testBreakdown.packaging_fee_percent}%</td>
                                                <td className="py-2.5 text-right font-semibold">₹{testBreakdown.packaging_fee.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">Platform Fee</td>
                                                <td className="py-2.5 text-stone-500">Flat app fee</td>
                                                <td className="py-2.5 text-stone-400">—</td>
                                                <td className="py-2.5 text-right font-semibold">₹{testBreakdown.platform_fee.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">CGST (Food & Packaging)</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.cgst_percent}%</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.food_and_packaging_base.toFixed(2)} &times; {testBreakdown.cgst_percent}%</td>
                                                <td className="py-2.5 text-right font-semibold">₹{testBreakdown.cgst.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">SGST (Food & Packaging)</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.sgst_percent}%</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.food_and_packaging_base.toFixed(2)} &times; {testBreakdown.sgst_percent}%</td>
                                                <td className="py-2.5 text-right font-semibold">₹{testBreakdown.sgst.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">GST on Platform Fee</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.platform_fee_gst_percent}%</td>
                                                <td className="py-2.5 text-stone-500">{testBreakdown.platform_fee.toFixed(2)} &times; {testBreakdown.platform_fee_gst_percent}%</td>
                                                <td className="py-2.5 text-right font-semibold">₹{testBreakdown.platform_fee_gst.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-stone-50/70 font-bold text-stone-900">
                                                <td className="py-2.5">Calculated Total</td>
                                                <td className="py-2.5 text-stone-500">Sum of charges</td>
                                                <td className="py-2.5 text-[11px] text-stone-500">
                                                    {testBreakdown.subtotal} + {testBreakdown.packaging_fee} + {testBreakdown.platform_fee} + {testBreakdown.cgst} + {testBreakdown.sgst} + {testBreakdown.platform_fee_gst}
                                                </td>
                                                <td className="py-2.5 text-right">₹{testBreakdown.calculated_total.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5 text-stone-500">Rounding Off Adjustment</td>
                                                <td className="py-2.5 text-stone-500">Ceil function</td>
                                                <td className="py-2.5 text-stone-500">Rounds up to next rupee (+₹{testBreakdown.rounding_off.toFixed(2)})</td>
                                                <td className="py-2.5 text-right text-stone-700 font-semibold">
                                                    {testBreakdown.rounding_off >= 0 ? `+₹${testBreakdown.rounding_off.toFixed(2)}` : `-₹${Math.abs(testBreakdown.rounding_off).toFixed(2)}`}
                                                </td>
                                            </tr>
                                            <tr className="border-t-2 border-orange-500/80 bg-orange-50/60 font-black text-orange-950">
                                                <td className="py-3 text-base">Grand Total (Payable)</td>
                                                <td className="py-3 text-xs font-semibold text-stone-600">Final bill</td>
                                                <td className="py-3 text-xs font-semibold text-stone-600">{testBreakdown.calculated_total.toFixed(2)} + {testBreakdown.rounding_off.toFixed(2)}</td>
                                                <td className="py-3 text-right text-lg text-orange-600">₹{testBreakdown.grand_total.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
