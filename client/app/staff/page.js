"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";

export default function StaffPage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [toast, setToast] = useState(null);

    // Add staff modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: "", email: "", password: "" });
    const [addLoading, setAddLoading] = useState(false);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [deleteLoading, setDeleteLoading] = useState(false);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
    };

    const getToken = () => localStorage.getItem("token");

    // Fetch all staff
    const fetchAllStaff = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/staff", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error("Failed to fetch staff");
            const data = await res.json();
            setStaff(data.staff);
        } catch (err) {
            showToast("Failed to load staff", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    // Guard: admin-only
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (!userData) {
            router.push("/login");
            return;
        }
        const parsed = JSON.parse(userData);
        if (parsed.role !== "ADMIN") {
            router.push("/home");
            return;
        }
        setUser(parsed);
        fetchAllStaff();
    }, [fetchAllStaff, router]);

    // Live search — fires 300ms after the user stops typing
    const searchTimer = useRef(null);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);

        if (!searchQuery.trim()) {
            setSearching(false);
            fetchAllStaff();
            return;
        }

        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `http://localhost:5000/api/staff/search?q=${encodeURIComponent(searchQuery.trim())}`,
                    { headers: { Authorization: `Bearer ${getToken()}` } }
                );
                if (!res.ok) throw new Error("Search failed");
                const data = await res.json();
                setStaff(data.staff);
            } catch {
                showToast("Search failed", "error");
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const handleClearSearch = () => setSearchQuery("");

    // Create staff
    const handleAddStaff = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/staff", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(addForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create staff");
            showToast(`Staff member "${addForm.name}" created successfully!`, "success");
            setShowAddModal(false);
            setAddForm({ name: "", email: "", password: "" });
            fetchAllStaff();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setAddLoading(false);
        }
    };

    // Delete staff
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/staff/${deleteTarget.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to delete staff");
            showToast(`Staff member "${deleteTarget.name}" deleted.`, "success");
            setDeleteTarget(null);
            fetchAllStaff();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    if (!user) return null;

    return (
        <>
            <Navbar />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <main className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50/30 to-amber-50/20 px-4 py-8">
                <div className="mx-auto max-w-6xl">

                    {/* Page Header */}
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-500/30">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900">Staff Management</h1>
                                    <p className="text-sm text-stone-500 font-medium">Manage your cafe staff members</p>
                                </div>
                            </div>
                        </div>

                        <button
                            id="add-staff-btn"
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition-all hover:bg-orange-700 active:scale-95"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Staff Member
                        </button>
                    </div>

                    {/* Stats Card */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Staff</p>
                            <p className="mt-1 text-3xl font-black text-orange-600">{staff.length}</p>
                        </div>
                        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Role</p>
                            <p className="mt-1 text-3xl font-black text-stone-700">STAFF</p>
                        </div>
                        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Status</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-sm font-bold text-green-700">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                                </svg>
                                <input
                                    id="staff-search-input"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or ID..."
                                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-stone-800 shadow-sm outline-none ring-0 transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-stone-400"
                                />
                                {loading && searching && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
                                )}
                            </div>
                            {searching && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-600 shadow-sm transition hover:bg-stone-100 active:scale-95"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Staff Table */}
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>
                                <p className="text-sm font-medium text-stone-400">Loading staff...</p>
                            </div>
                        ) : staff.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                                    <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-base font-bold text-stone-500">
                                    {searching ? "No staff found matching your search" : "No staff members yet"}
                                </p>
                                {!searching && (
                                    <p className="text-sm text-stone-400">Click &quot;Add Staff Member&quot; to get started</p>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Table Header */}
                                <div className="border-b border-stone-100 bg-stone-50 px-6 py-3">
                                    <div className="grid grid-cols-12 gap-4 text-xs font-extrabold uppercase tracking-wider text-stone-400">
                                        <span className="col-span-1">ID</span>
                                        <span className="col-span-3">Name</span>
                                        <span className="col-span-4">Email</span>
                                        <span className="col-span-2">Role</span>
                                        <span className="col-span-1">Joined</span>
                                        <span className="col-span-1 text-right">Action</span>
                                    </div>
                                </div>

                                {/* Table Rows */}
                                <div className="divide-y divide-stone-100">
                                    {staff.map((member) => (
                                        <div
                                            key={member.id}
                                            className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition hover:bg-orange-50/40"
                                        >
                                            {/* ID */}
                                            <span className="col-span-1 text-xs font-mono font-bold text-stone-400">#{member.id}</span>

                                            {/* Name with Avatar */}
                                            <div className="col-span-3 flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-sm font-black text-white shadow-sm">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate text-sm font-bold text-stone-800">{member.name}</span>
                                            </div>

                                            {/* Email */}
                                            <span className="col-span-4 truncate text-sm text-stone-500 font-medium">{member.email}</span>

                                            {/* Role Badge */}
                                            <span className="col-span-2">
                                                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800">
                                                    {member.role}
                                                </span>
                                            </span>

                                            {/* Joined Date */}
                                            <span className="col-span-1 text-xs font-medium text-stone-400 whitespace-nowrap">
                                                {formatDate(member.created_at)}
                                            </span>

                                            {/* Delete Button */}
                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    id={`delete-staff-${member.id}`}
                                                    onClick={() => setDeleteTarget({ id: member.id, name: member.name })}
                                                    className="rounded-lg p-1.5 text-stone-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90"
                                                    title="Delete staff member"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Table Footer */}
                                <div className="border-t border-stone-100 bg-stone-50 px-6 py-3 text-xs font-medium text-stone-400">
                                    Showing {staff.length} staff member{staff.length !== 1 ? "s" : ""}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Add Staff Modal ── */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
                        {/* Modal Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900">Add Staff Member</h2>
                                    <p className="text-xs text-stone-400">Create a new staff account</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="staff-name">
                                    Full Name
                                </label>
                                <input
                                    id="staff-name"
                                    type="text"
                                    placeholder="e.g. Ravi Kumar"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    required
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="staff-email">
                                    Email Address
                                </label>
                                <input
                                    id="staff-email"
                                    type="email"
                                    placeholder="staff@cafename.com"
                                    value={addForm.email}
                                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                    required
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="staff-password">
                                    Password
                                </label>
                                <input
                                    id="staff-password"
                                    type="password"
                                    placeholder="Min. 6 characters"
                                    value={addForm.password}
                                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                                    required
                                    minLength={6}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-100 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="confirm-add-staff-btn"
                                    type="submit"
                                    disabled={addLoading}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-700 active:scale-95 disabled:opacity-60"
                                >
                                    {addLoading ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Staff"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
                >
                    <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex flex-col items-center text-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-900">Delete Staff Member?</h2>
                                <p className="mt-1 text-sm text-stone-500">
                                    You are about to delete{" "}
                                    <span className="font-bold text-stone-800">{deleteTarget.name}</span>
                                    {" "}(ID: #{deleteTarget.id}). This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-100 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                id="confirm-delete-staff-btn"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/30 transition hover:bg-red-700 active:scale-95 disabled:opacity-60"
                            >
                                {deleteLoading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
