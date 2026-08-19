const express = require("express");

const {
    getAllProducts,createProduct, getProductById,updateProduct,deleteProduct} = require("../controllers/productController");

const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get("/", getAllProducts);
router.post(
    "/",
    authenticateToken,
    authorizeRoles("ADMIN"),
    createProduct
);
router.get("/:id", getProductById);
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("ADMIN"),
    updateProduct
);
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("ADMIN"),
    deleteProduct
);
module.exports = router;