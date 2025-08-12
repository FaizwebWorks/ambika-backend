const express = require("express");
const { check } = require("express-validator");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin routes
router.post(
  "/",
  [
    check("name", "Category name is required").notEmpty(),
  ],
  protect,
  admin,
  createCategory
);

router.put("/:id", protect, admin, updateCategory);
router.delete("/:id", protect, admin, deleteCategory);

module.exports = router;