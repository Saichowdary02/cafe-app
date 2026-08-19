"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

const categories = ["Chai", "Coffee", "Snacks"];

export default function ItemsPage() {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cart, setCart] = useState([]);

    useEffect(() => {
        const savedCart = localStorage.getItem("cart");

        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }

        const fetchProducts = async () => {

            try {

                const response = await fetch(
                    "http://localhost:5000/api/products"
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Failed to fetch products"
                    );
                }

                setProducts(data.products || []);

            } catch (error) {

                console.error(error);
                setError("Unable to load products.");

            } finally {

                setLoading(false);

            }
        };

        fetchProducts();

    }, []);


    // Group products by category
    const getProductsByCategory = (category) => {

        return products.filter(
            (product) =>
                product.category?.toLowerCase() ===
                category.toLowerCase()
        );

    };
    const addToCart = (product) => {

    const existingItem = cart.find(
        (item) => item.id === product.id
    );

    let updatedCart;

    if (existingItem) {

        updatedCart = cart.map((item) =>
            item.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1
                }
                : item
        );

    } else {

        updatedCart = [
            ...cart,
            {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image: product.image,
                category: product.category,
                quantity: 1
            }
        ];

    }

    setCart(updatedCart);

    localStorage.setItem(
        "cart",
        JSON.stringify(updatedCart)
    );
};


    return (

        <ProtectedRoute>

            <div className="min-h-screen bg-gray-50">

                <Navbar />

                <main className="mx-auto max-w-7xl px-6 py-10">

                    {/* Header */}

                    <div className="mb-10">

                        <h1 className="text-4xl font-bold text-gray-900">
                            Cafe Menu
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Choose from our selection of tea, coffee and snacks.
                        </p>

                    </div>


                    {/* Loading */}

                    {loading && (

                        <div className="py-20 text-center">

                            <p className="text-gray-600">
                                Loading menu...
                            </p>

                        </div>

                    )}


                    {/* Error */}

                    {!loading && error && (

                        <div className="rounded-lg bg-red-50 p-6 text-center text-red-600">
                            {error}
                        </div>

                    )}


                    {/* Category Sections */}

                    {!loading && !error && (

                        <div className="space-y-14">

                            {categories.map((category) => {

                                const categoryProducts =
                                    getProductsByCategory(category);

                                // Don't show empty categories
                                if (categoryProducts.length === 0) {
                                    return null;
                                }


                                return (

                                    <section key={category}>

                                        {/* Category heading */}

                                        <div className="mb-6 flex items-center gap-3">

                                            <h2 className="text-2xl font-bold text-gray-900">
                                                {category}
                                            </h2>

                                            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">
                                                {categoryProducts.length} items
                                            </span>

                                        </div>


                                        {/* Products */}

                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                                            {categoryProducts.map((product) => (

                                                <div
                                                    key={product.id}
                                                    className="overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                                                >

                                                    {/* Product Image */}

                                                    {product.image ? (

                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className="h-56 w-full object-cover"
                                                        />

                                                    ) : (

                                                        <div className="flex h-56 w-full items-center justify-center bg-gray-100 text-6xl">
                                                            ☕
                                                        </div>

                                                    )}


                                                    {/* Product Details */}

                                                    <div className="p-5">

                                                        <p className="text-sm font-medium text-orange-600">
                                                            {product.category}
                                                        </p>


                                                        <h3 className="mt-1 text-lg font-semibold text-gray-900">
                                                            {product.name}
                                                        </h3>


                                                        <div className="mt-5 flex items-center justify-between">

                                                            <span className="text-xl font-bold text-gray-900">
                                                                ₹{Number(product.price).toFixed(2)}
                                                            </span>

                                                        <button
                                                            onClick={() => addToCart(product)}
                                                            className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition hover:bg-orange-700"
                                                        >
                                                            Add
                                                        </button>

                                                        </div>

                                                    </div>

                                                </div>

                                            ))}

                                        </div>

                                    </section>

                                );

                            })}

                        </div>

                    )}


                    {/* No Products */}

                    {!loading &&
                        !error &&
                        products.length === 0 && (

                            <div className="py-20 text-center">

                                <p className="text-gray-600">
                                    No products available.
                                </p>

                            </div>

                        )}

                </main>

            </div>

        </ProtectedRoute>
    );
}