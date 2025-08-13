const express = require("express");
const { check } = require("express-validator");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateCategories
} = require("../controllers/categoryController");
const { protect, admin } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin routes with image upload
router.post(
  "/",
  protect,
  admin,
  upload.single('image'), // Handle single image upload
  [
    check("name", "Category name is required").notEmpty(),
  ],
  createCategory
);

router.put(
  "/:id", 
  protect, 
  admin, 
  upload.single('image'), // Handle single image upload
  updateCategory
);

router.delete("/:id", protect, admin, deleteCategory);

// Bulk operations
router.put("/bulk", protect, admin, bulkUpdateCategories);

module.exports = router;