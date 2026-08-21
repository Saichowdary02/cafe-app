"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

const CATEGORIES = ["Chai", "Coffee", "Snacks"];

const EMPTY_ADD_FORM = {
    name: "",
    price: "",
    category: "Chai",
    image: "",
};

const EMPTY_UPDATE_FORM = {
    id: "",
    name: "",
    price: "",
    category: "Chai",
    image: "",
};

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
            <div className="min-h-screen">

                <Navbar />

                <main className="mx-auto max-w-3xl px-6 py-10">

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Manage Products
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Add, update, or remove products from the menu.
                            Use the Items page to look up a product&apos;s ID.
                        </p>
                    </div>


                    {/* ---------------- Get Info ---------------- */}

                    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-bold text-gray-900">
                            Get Product Info
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            Search by ID (exact) or name (partial match) — results appear as you type.
                        </p>

                        <div className="mt-4 relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Product ID or name, e.g. 4 or Mocha"
                                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-orange-500 focus:outline-none"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
                            )}
                        </div>

                        {searchError && (
                            <p className="mt-3 text-sm text-red-600">{searchError}</p>
                        )}

                        {searchResults && (
                            <div className="mt-4 space-y-3">

                                {searchResults.map((product) => (

                                    <div
                                        key={product.id}
                                        className="flex items-center gap-4 rounded-lg border bg-gray-50 p-4"
                                    >

                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="h-14 w-14 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-200 text-2xl">
                                                ☕
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                                                {product.category}
                                            </p>
                                            <h3 className="font-bold text-gray-900">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                ₹{Number(product.price).toFixed(2)}
                                            </p>
                                        </div>

                                        <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                                            ID #{product.id}
                                        </div>

                                    </div>

                                ))}

                            </div>
                        )}

                    </div>


                    {/* ---------------- Add Product ---------------- */}

                    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-bold text-gray-900">
                            Add New Product
                        </h2>

                        <form onSubmit={handleAdd} className="mt-4 space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, name: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
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
                                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Category
                                    </label>
                                    <select
                                        value={addForm.category}
                                        onChange={(e) =>
                                            setAddForm({ ...addForm, category: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
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
                                <label className="block text-sm font-medium text-gray-700">
                                    Image URL (optional)
                                </label>
                                <input
                                    type="text"
                                    value={addForm.image}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, image: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            {addError && (
                                <p className="text-sm text-red-600">{addError}</p>
                            )}

                            {addSuccess && (
                                <p className="text-sm text-green-600">{addSuccess}</p>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                                {creating ? "Adding..." : "Add Product"}
                            </button>

                        </form>

                    </div>


                    {/* ---------------- Update Product ---------------- */}

                    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-bold text-gray-900">
                            Update Product
                        </h2>

                        <form onSubmit={handleUpdate} className="mt-4 space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Product ID
                                </label>
                                <input
                                    type="number"
                                    value={updateForm.id}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, id: e.target.value })
                                    }
                                    placeholder="e.g. 4"
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={updateForm.name}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, name: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
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
                                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Category
                                    </label>
                                    <select
                                        value={updateForm.category}
                                        onChange={(e) =>
                                            setUpdateForm({ ...updateForm, category: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
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
                                <label className="block text-sm font-medium text-gray-700">
                                    Image URL (optional)
                                </label>
                                <input
                                    type="text"
                                    value={updateForm.image}
                                    onChange={(e) =>
                                        setUpdateForm({ ...updateForm, image: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            {updateError && (
                                <p className="text-sm text-red-600">{updateError}</p>
                            )}

                            {updateSuccess && (
                                <p className="text-sm text-green-600">{updateSuccess}</p>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Update Product"}
                            </button>

                        </form>

                    </div>


                    {/* ---------------- Delete Product ---------------- */}

                    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">

                        <h2 className="text-lg font-bold text-gray-900">
                            Delete Product
                        </h2>

                        <form onSubmit={handleDelete} className="mt-4 space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Product ID
                                </label>
                                <input
                                    type="number"
                                    value={deleteId}
                                    onChange={(e) => setDeleteId(e.target.value)}
                                    placeholder="e.g. 4"
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                                />
                            </div>

                            {deleteError && (
                                <p className="text-sm text-red-600">{deleteError}</p>
                            )}

                            {deleteSuccess && (
                                <p className="text-sm text-green-600">{deleteSuccess}</p>
                            )}

                            <button
                                type="submit"
                                disabled={deleting}
                                className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-700 hover:shadow-md hover:shadow-red-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete Product"}
                            </button>

                        </form>

                    </div>

                </main>

            </div>
        </ProtectedRoute>
    );
}