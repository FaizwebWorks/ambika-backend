const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts
} = require("../controllers/productController");
const { protect, admin } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Simple validation function
const validateProduct = (req, res, next) => {
  const { title, description, price, stock, category } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Title is required"
    });
  }
  
  if (!description) {
    return res.status(400).json({
      success: false,
      message: "Description is required"
    });
  }
  
  if (!price || price < 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a positive number"
    });
  }
  
  if (!stock || stock < 0) {
    return res.status(400).json({
      success: false,
      message: "Stock must be a positive number"
    });
  }
  
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Category is required"
    });
  }
  
  next();
};

// Admin routes with image upload
router.post(
  "/",
  protect,
  admin,
  upload.array('images', 5), // Handle multiple image uploads (max 5)
  validateProduct,
  createProduct
);

router.put(
  "/:id", 
  protect, 
  admin, 
  upload.array('images', 5), // Handle multiple image uploads (max 5)
  updateProduct
);

router.delete("/:id", protect, admin, deleteProduct);

// Bulk operations
router.put("/bulk", protect, admin, bulkUpdateProducts);

module.exports = router;