const express = require("express");
const { check } = require("express-validator");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin routes
router.post(
  "/",
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description is required").notEmpty(),
    check("price", "Price must be a positive number").isNumeric().toFloat().isFloat({ min: 0 }),
    check("stock", "Stock must be a positive number").isNumeric().toInt().isInt({ min: 0 }),
    check("category", "Category is required").notEmpty(),
    check("images", "At least one image is required").isArray({ min: 1 })
  ],
  protect,
  admin,
  createProduct
);

router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

module.exports = router;