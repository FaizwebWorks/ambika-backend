const express = require("express");
const { check } = require("express-validator");
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Register user
router.post(
  "/register",
  [
    check("username", "Username is required").notEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  register
);

// Login user
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  login
);

// Get user profile
router.get("/profile", protect, getProfile);

// Update user profile
router.put("/profile", protect, updateProfile);

// Change password
router.put(
  "/change-password",
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength(
      { min: 6 }
    ),
  ],
  protect,
  changePassword
);

// Wishlist routes
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/add/:productId", protect, addToWishlist);
router.delete("/wishlist/remove/:productId", protect, removeFromWishlist);

module.exports = router;
