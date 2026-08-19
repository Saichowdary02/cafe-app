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
    const [recentlyAddedId, setRecentlyAddedId] = useState(null);
    const [toastMessage, setToastMessage] = useState("");



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

    // Visual feedback
    setRecentlyAddedId(product.id);
    setToastMessage(`Added "${product.name}" to cart! 🛒`);

    setTimeout(() => {
        setRecentlyAddedId(null);
    }, 1200);

    setTimeout(() => {
        setToastMessage("");
    }, 2500);

};





    return (



        <ProtectedRoute>



            <div className="min-h-screen">



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



                                        {/* Products Grid */}
                                        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                            {categoryProducts.map((product) => {
                                                const cartItem = cart.find((item) => item.id === product.id);
                                                const isRecentlyAdded = recentlyAddedId === product.id;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-950/5"
                                                    >
                                                        {/* Product Image Area with Zoom & Badges */}
                                                        <div className="relative h-52 w-full overflow-hidden bg-stone-100/70">
                                                            {product.image ? (
                                                                <img
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/60 text-5xl">
                                                                    {category === "Coffee" ? "☕" : category === "Chai" ? "🍵" : "🥐"}
                                                                </div>
                                                            )}

                                                            {/* Floating Category Pill */}
                                                            <span className="absolute top-3 left-3 rounded-full border border-stone-200/60 bg-white/90 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-stone-700 shadow-sm backdrop-blur-md">
                                                                {product.category}
                                                            </span>

                                                            {/* In-Cart Pill */}
                                                            {cartItem && (
                                                                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-md shadow-orange-600/30 animate-in fade-in">
                                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    <span>{cartItem.quantity} in cart</span>
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Product Details */}
                                                        <div className="flex flex-1 flex-col justify-between p-5">
                                                            <div>
                                                                <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-orange-600">
                                                                    {product.name}
                                                                </h3>
                                                            </div>

                                                            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                                                                <div>
                                                                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                                                                        Price
                                                                    </span>
                                                                    <span className="text-xl font-extrabold text-gray-900">
                                                                        ₹{Number(product.price).toFixed(2)}
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    onClick={() => addToCart(product)}
                                                                    className={`group/btn inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                                                                        isRecentlyAdded
                                                                            ? "bg-emerald-600 text-white shadow-emerald-500/25 hover:bg-emerald-700"
                                                                            : "bg-orange-600 text-white shadow-orange-500/25 hover:bg-orange-700 hover:shadow-md hover:shadow-orange-500/30"
                                                                    }`}
                                                                >
                                                                    {isRecentlyAdded ? (
                                                                        <>
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                className="h-4 w-4"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                                strokeWidth={2.5}
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="M5 13l4 4L19 7"
                                                                                />
                                                                            </svg>
                                                                            <span>Added!</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-125"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                                strokeWidth={2.5}
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="M12 4.5v15m7.5-7.5h-15"
                                                                                />
                                                                            </svg>
                                                                            <span>{cartItem ? `Add (${cartItem.quantity})` : "Add"}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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

            {/* Floating Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-stone-700/50 bg-gray-900/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md transition-all duration-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                        ✓
                    </span>
                    <p className="text-sm font-medium">{toastMessage}</p>
                </div>
            )}

        </ProtectedRoute>

    );

} 

