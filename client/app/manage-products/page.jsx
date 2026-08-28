"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

const CATEGORIES = ["Chai", "Coffee", "Snacks"];

const EMPTY_ADD_FORM = {
    name: "",
    price: "",
    description: "",
    category: "Chai",
    image: "",
};

const EMPTY_UPDATE_FORM = {
    id: "",
    name: "",
    price: "",
    description: "",
    category: "Chai",
    image: "",
};

// ---------- Shared UI style tokens ----------
const INPUT_CLASS =
    "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-2xs outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS =
    "block text-[11px] font-bold uppercase tracking-wider text-stone-500";

function SectionHeader({ icon, badgeClass, title, subtitle }) {
    return (
        <div className="flex items-start gap-3.5">
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg shadow-2xs ${badgeClass}`}
            >
                {icon}
            </div>
            <div>
                <h2 className="text-base font-extrabold tracking-tight text-gray-900">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

export default function ManageProductsPage() {

    // ---------- Add ----------
    const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
    const [creating, setCreating] = useState(false);
    const [addError, setAddError] = useState("");
    const [addSuccess, setAddSuccess] = useState("");

    // ---------- Update ----------
    const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE_FORM);
    const [saving, setSaving] = useState(false);
    const [updateError, setUpdateError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState("");
    const [fetchingProduct, setFetchingProduct] = useState(false);
    const [fetchProductNote, setFetchProductNote] = useState(null); // { type: 'info'|'error', text }

    // Auto-fetch product details when a valid ID is entered (debounced 400ms)
    const fetchTimer = useRef(null);

    useEffect(() => {
        if (fetchTimer.current) clearTimeout(fetchTimer.current);

        const id = updateForm.id.trim();

        if (!id || !/^\d+$/.test(id)) {
            setFetchProductNote(null);
            setFetchingProduct(false);
            return;
        }

        setFetchingProduct(true);
        setFetchProductNote(null);

        fetchTimer.current = setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/products/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || `No product found with ID #${id}`);
                }

                const product = data.product;

                setUpdateForm((prev) => ({
                    ...prev,
                    name: product.name || "",
                    price: product.price !== null && product.price !== undefined ? String(product.price) : "",
                    description: product.description || "",
                    category: CATEGORIES.includes(product.category) ? product.category : prev.category,
                    image: product.image || "",
                }));

                setFetchProductNote({
                    type: "info",
                    text: `Loaded "${product.name}" (ID #${product.id}) — edit the fields below and save.`,
                });
            } catch (err) {
                console.error(err);
                setFetchProductNote({ type: "error", text: err.message });
            } finally {
                setFetchingProduct(false);
            }
        }, 400);

        return () => clearTimeout(fetchTimer.current);
    }, [updateForm.id]);

    // ---------- Delete ----------
    const [deleteId, setDeleteId] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteSuccess, setDeleteSuccess] = useState("");

    // ---------- Get Info (search by ID or name) ----------
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [searchResults, setSearchResults] = useState(null);

    // Live product search — debounced 300ms
    const searchTimer = useRef(null);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);

        const term = searchTerm.trim();

        if (!term) {
            setSearchResults(null);
            setSearchError("");
            setSearching(false);
            return;
        }

        setSearching(true);
        setSearchError("");

        searchTimer.current = setTimeout(async () => {
            try {
                const isNumeric = /^\d+$/.test(term);

                if (isNumeric) {
                    const response = await fetch(`http://localhost:5000/api/products/${term}`);
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Product not found");
                    setSearchResults([data.product]);
                } else {
                    const response = await fetch("http://localhost:5000/api/products");
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Failed to fetch products");
                    const matches = (data.products || []).filter((p) =>
                        p.name.toLowerCase().includes(term.toLowerCase())
                    );
                    if (matches.length === 0) {
                        setSearchError(`No products found matching "${term}".`);
                        setSearchResults(null);
                    } else {
                        setSearchResults(matches);
                    }
                }
            } catch (err) {
                console.error(err);
                setSearchError(err.message);
                setSearchResults(null);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(searchTimer.current);
    }, [searchTerm]);


    // ---------- Add product ----------

    const handleAdd = async (e) => {
        e.preventDefault();

        setAddError("");
        setAddSuccess("");

        if (!addForm.name || addForm.price === "" || !addForm.category) {
            setAddError("Name, price and category are required.");
            return;
        }

        if (Number(addForm.price) < 0) {
            setAddError("Price cannot be negative.");
            return;
        }

        try {
            setCreating(true);

            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:5000/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: addForm.name,
                    price: Number(addForm.price),
                    description: addForm.description || null,
                    category: addForm.category,
                    image: addForm.image || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create product");
            }

            setAddSuccess(`"${data.product.name}" added with ID #${data.product.id}.`);
            setAddForm(EMPTY_ADD_FORM);

        } catch (err) {
            console.error(err);
            setAddError(err.message);
        } finally {
            setCreating(false);
        }
    };


    // ---------- Update product ----------

    const handleUpdate = async (e) => {
        e.preventDefault();

        setUpdateError("");
        setUpdateSuccess("");

        if (!updateForm.id) {
            setUpdateError("Product ID is required.");
            return;
        }

        if (!updateForm.name || updateForm.price === "" || !updateForm.category) {
            setUpdateError("Name, price and category are required.");
            return;
        }

        if (Number(updateForm.price) < 0) {
            setUpdateError("Price cannot be negative.");
            return;
        }

        try {
            setSaving(true);

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/products/${updateForm.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: updateForm.name,
                        price: Number(updateForm.price),
                        description: updateForm.description || null,
                        category: updateForm.category,
                        image: updateForm.image || null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update product");
            }

            setUpdateSuccess(`"${data.product.name}" (ID #${data.product.id}) updated successfully.`);
            setUpdateForm(EMPTY_UPDATE_FORM);

        } catch (err) {
            console.error(err);
            setUpdateError(err.message);
        } finally {
            setSaving(false);
        }
    };


    // ---------- Delete product ----------

    const handleDelete = async (e) => {
        e.preventDefault();

        setDeleteError("");
        setDeleteSuccess("");

        if (!deleteId) {
            setDeleteError("Product ID is required.");
            return;
        }

        const confirmed = window.confirm(
            `Delete product #${deleteId}? This cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/products/${deleteId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to delete product");
            }

            setDeleteSuccess(`"${data.product.name}" (ID #${data.product.id}) deleted successfully.`);
            setDeleteId("");

        } catch (err) {
            console.error(err);
            setDeleteError(err.message);
        } finally {
            setDeleting(false);
        }
    };


    // handleSearch removed — replaced by live useEffect above


    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="min-h-screen bg-linear-to-b from-amber-50/60 via-white to-orange-50/40">

                <Navbar />

                <main className="mx-auto max-w-6xl px-6 py-10">

                    {/* Hero header */}
                    <div className="relative mb-10 overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-7 shadow-sm backdrop-blur-sm sm:p-8">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-amber-400 via-orange-400 to-rose-400" />
                        <div
                            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-orange-100/70 blur-3xl"
                            aria-hidden="true"
                        />
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-200/80 bg-linear-to-br from-orange-50 to-amber-50 text-2xl shadow-2xs">
                                🧾
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600">
                                    Admin · Menu Control
                                </p>
                                <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                                    Manage Products
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
                                    Add, update, or remove products from the menu.
                                    Use the <span className="font-semibold text-stone-800">Items</span> page
                                    to look up a product&apos;s ID.
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* ---------------- CRUD 2x2 Grid ---------------- */}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* ---------------- Get Info ---------------- */}

                    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-orange-300/80 hover:shadow-lg hover:shadow-orange-950/5 h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-sky-400 to-indigo-500" />

                        <div className="mt-1">
                            <SectionHeader
                                icon="🔍"
                                badgeClass="border-sky-200/80 bg-linear-to-br from-sky-50 to-indigo-50 text-sky-600"
                                title="Get Product Info"
                                subtitle="Search by ID (exact) or name (partial match) — results appear as you type."
                            />
                        </div>

                        <div className="mt-5 relative">
                            <svg
                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Product ID or name, e.g. 4 or Mocha"
                                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm text-stone-800 shadow-2xs outline-none transition placeholder:text-stone-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
                            )}
                        </div>

                        {searchError && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs font-bold text-red-700">
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {searchError}
                            </div>
                        )}

                        {searchResults && (
                            <div className="mt-5 space-y-3">

                                {searchResults.map((product) => (

                                    <div
                                        key={product.id}
                                        className="flex items-center gap-4 rounded-2xl border border-stone-100/90 bg-stone-50/70 p-4 transition-all duration-200 hover:border-orange-200 hover:bg-orange-50/40"
                                    >

                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="h-14 w-14 rounded-xl border border-stone-200/70 object-cover shadow-2xs"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-orange-200/80 bg-linear-to-br from-orange-50 to-amber-50 text-2xl shadow-2xs">
                                                ☕
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <span className="rounded-full bg-orange-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                                {product.category}
                                            </span>
                                            <h3 className="mt-1 truncate font-extrabold text-gray-900">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm font-bold text-orange-600">
                                                ₹{Number(product.price).toFixed(2)}
                                            </p>
                                            {product.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="shrink-0 rounded-xl border border-stone-200/80 bg-white px-3 py-1.5 text-xs font-black text-stone-600 shadow-2xs">
                                            ID #{product.id}
                                        </div>

                                    </div>

                                ))}

                            </div>
                        )}

                    </div>


                    {/* ---------------- Add Product ---------------- */}

                    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-orange-300/80 hover:shadow-lg hover:shadow-orange-950/5 h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-400 to-teal-500" />

                        <div className="mt-1">
                            <SectionHeader
                                icon="➕"
                                badgeClass="border-emerald-200/80 bg-linear-to-br from-emerald-50 to-teal-50 text-emerald-600"
                                title="Add New Product"
                                subtitle="Create a fresh menu item for customers to order."
                            />
                        </div>

                        <form onSubmit={handleAdd} className="mt-5 space-y-4">

                            <div>
                                <label className={LABEL_CLASS}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, name: e.target.value })
                                    }
                                    placeholder="e.g. Masala Chai"
                                    className={INPUT_CLASS}
                                />
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    Description
                                </label>
                                <textarea
                                    rows="3"
                                    maxLength="500"
                                    value={addForm.description}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, description: e.target.value })
                                    }
                                    placeholder="e.g. Freshly brewed with hand-pounded elaichi and premium tea leaves"
                                    className={INPUT_CLASS + " resize-none"}
                                />
                                <p className="mt-1 text-right text-xs text-gray-400">
                                    {addForm.description.length}/500
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={addForm.price}
                                        onChange={(e) =>
                                            setAddForm({ ...addForm, price: e.target.value })
                                        }
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Category
                                    </label>
                                    <select
                                        value={addForm.category}
                                        onChange={(e) =>
                                            setAddForm({ ...addForm, category: e.target.value })
                                        }
                                        className={INPUT_CLASS}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    Image URL (optional)
                                </label>
                                <input
                                    type="text"
                                    value={addForm.image}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, image: e.target.value })
                                    }
                                    className={INPUT_CLASS}
                                />
                            </div>

                            {addError && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs font-bold text-red-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>{addError}</div>
                            )}

                            {addSuccess && (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs font-bold text-emerald-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{addSuccess}</div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-md hover:shadow-emerald-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Adding...
                                    </span>
                                ) : (
                                    <>
                                        <span>＋ Add Product</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>

                        </form>

                    </div>


                    {/* ---------------- Update Product ---------------- */}

                    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-amber-900/10 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-orange-300/80 hover:shadow-lg hover:shadow-orange-950/5 h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-400 to-indigo-500" />

                        <div className="mt-1">
                            <SectionHeader
                                icon="✏️"
                                badgeClass="border-blue-200/80 bg-linear-to-br from-blue-50 to-indigo-50 text-blue-600"
                                title="Update Product"
                                subtitle="Enter a Product ID — its details load automatically for editing."
                            />
                        </div>

                        <form onSubmit={handleUpdate} className="mt-5 space-y-4">

                            <div>
                                <label className={LABEL_CLASS}>
                                    Product ID
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={updateForm.id}
                                        onChange={(e) =>
                                            setUpdateForm({ ...updateForm, id: e.target.value })
                                        }
                                        placeholder="e.g. 4"
                                        className={INPUT_CLASS + " pr-10"}
                                    />
                                    {fetchingProduct && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-blue-500" />
                                    )}
                                </div>

                                {fetchProductNote && (
                                    <div
                                        className={`mt-2.5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
                                            fetchProductNote.type === "error"
                                                ? "border-red-200 bg-red-50/90 text-red-700"
                                                : "border-blue-200 bg-blue-50/90 text-blue-700"
                                        }`}
                                    >
                                        {fetchProductNote.type === "error" ? (
                                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        {fetchProductNote.text}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={updateForm.name}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, name: e.target.value })
                                    }
                                    className={INPUT_CLASS}
                                />
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    Description
                                </label>
                                <textarea
                                    rows="3"
                                    maxLength="500"
                                    value={updateForm.description}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, description: e.target.value })
                                    }
                                    placeholder="e.g. Freshly brewed with hand-pounded elaichi and premium tea leaves"
                                    className={INPUT_CLASS + " resize-none"}
                                />
                                <p className="mt-1 text-right text-xs text-gray-400">
                                    {updateForm.description.length}/500
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={updateForm.price}
                                        onChange={(e) =>
                                            setUpdateForm({ ...updateForm, price: e.target.value })
                                        }
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Category
                                    </label>
                                    <select
                                        value={updateForm.category}
                                        onChange={(e) =>
                                            setUpdateForm({ ...updateForm, category: e.target.value })
                                        }
                                        className={INPUT_CLASS}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    Image URL (optional)
                                </label>
                                <input
                                    type="text"
                                    value={updateForm.image}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, image: e.target.value })
                                    }
                                    className={INPUT_CLASS}
                                />
                            </div>

                            {updateError && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs font-bold text-red-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>{updateError}</div>
                            )}

                            {updateSuccess && (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs font-bold text-emerald-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{updateSuccess}</div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md hover:shadow-blue-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Saving...
                                    </span>
                                ) : (
                                    <>
                                        <span>💾 Save Changes</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>

                        </form>

                    </div>


                    {/* ---------------- Delete Product ---------------- */}

                    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-red-900/10 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-red-300/80 hover:shadow-lg hover:shadow-red-950/5 h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-rose-500 to-red-600" />

                        <div className="mt-1">
                            <SectionHeader
                                icon="🗑️"
                                badgeClass="border-red-200/80 bg-linear-to-br from-rose-50 to-red-50 text-red-600"
                                title="Delete Product"
                                subtitle="Permanently remove a product from the menu. This cannot be undone."
                            />
                        </div>

                        <form onSubmit={handleDelete} className="mt-5 space-y-4">

                            <div>
                                <label className={LABEL_CLASS}>
                                    Product ID
                                </label>
                                <input
                                    type="number"
                                    value={deleteId}
                                    onChange={(e) => setDeleteId(e.target.value)}
                                    placeholder="e.g. 4"
                                    className={INPUT_CLASS}
                                />
                            </div>

                            {deleteError && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs font-bold text-red-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>{deleteError}</div>
                            )}

                            {deleteSuccess && (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs font-bold text-emerald-700"><svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{deleteSuccess}</div>
                            )}

                            <button
                                type="submit"
                                disabled={deleting}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-rose-600 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-rose-700 hover:to-red-700 hover:shadow-md hover:shadow-red-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {deleting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : (
                                    <>
                                        <span>🗑️ Delete Product</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </>
                                )}
                            </button>

                        </form>

                    </div>

                    </div>

                </main>

            </div>
        </ProtectedRoute>
    );
}