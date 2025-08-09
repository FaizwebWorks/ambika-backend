const express = require("express");
const {register, login, getProfile, updateProfile} = require("../controllers/userController");
const auth = require("../middleware/auth");
const router = express.Router();

// User registration
router.post("/register", register);

// User login
router.post("/login", login);

// Get user profile
router.get("/profile", auth, getProfile);

// Update user profile
router.put("/update-profile", auth, updateProfile);

module.exports = router;