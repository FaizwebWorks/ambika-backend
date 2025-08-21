const User = require("../models/user");
const Wishlist = require("../models/wishlist");
const Product = require("../models/product");
const QuoteRequest = require("../models/quoteRequest");
const NotificationService = require("../services/notificationService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// Register B2B user
exports.registerB2B = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      username, 
      email, 
      password, 
      name,
      phone,
      companyName,
      businessType,
      gstNumber,
      businessAddress,
      contactPerson,
      designation,
      businessPhone,
      businessEmail,
      annualRequirement
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already taken",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create B2B user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name: name || username,
      phone,
      customerType: "B2B",
      approvalStatus: "pending",
      businessDetails: {
        companyName,
        businessType,
        gstNumber,
        businessAddress,
        contactPerson,
        designation,
        businessPhone,
        businessEmail,
        annualRequirement,
        isVerified: false
      }
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Create notification for B2B registration
    try {
      await NotificationService.createB2BRegistrationNotification(user);
    } catch (notificationError) {
      console.error("Error creating B2B registration notification:", notificationError);
      // Don't fail the registration if notification fails
    }

    res.status(201).json({
      success: true,
      token,
      message: "B2B registration successful. Your account is pending approval.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus,
        businessDetails: user.businessDetails
      },
    });
  } catch (error) {
    console.error("B2B Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during B2B registration",
    });
  }
};

// Register user
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already taken",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name: name || username,
      customerType: "B2C", // Default to B2C for regular registration
      approvalStatus: "approved" // B2C users are auto-approved
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus,
        businessDetails: user.businessDetails
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is already attached to req from auth middleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving profile",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        phone,
        address,
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

// Helper function to generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ userId: id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Get user wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: "items.product",
      select: "name title price discountPrice images category stock",
      populate: {
        path: "category",
        select: "name",
      },
    });

    // If no wishlist exists, create an empty one
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({
      success: true,
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving wishlist",
    });
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    // Check if product already in wishlist
    if (wishlist.hasProduct(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Add product to wishlist
    wishlist.items.push({ product: productId });
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: "items.product",
      select: "name title price discountPrice images category",
      populate: {
        path: "category",
        select: "name",
      },
    });

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding to wishlist",
    });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Find wishlist
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Check if product exists in wishlist
    const itemIndex = wishlist.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove product from wishlist
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: "items.product",
      select: "name title price discountPrice images category",
      populate: {
        path: "category",
        select: "name",
      },
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing from wishlist",
    });
  }
};

// Create quote request (B2B only)
exports.createQuoteRequest = async (req, res) => {
  try {
    // Check if user is B2B
    if (req.user.customerType !== "B2B") {
      return res.status(403).json({
        success: false,
        message: "Quote requests are only available for B2B customers",
      });
    }

    // Check if user is approved
    if (req.user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your B2B account needs to be approved before requesting quotes",
      });
    }

    const {
      items,
      deliveryAddress,
      deliveryTimeline,
      additionalRequirements,
      businessJustification,
      budgetRange
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required for quote request",
      });
    }

    // Create quote request
    const quoteRequest = await QuoteRequest.create({
      user: req.user._id,
      items,
      deliveryAddress,
      deliveryTimeline,
      additionalRequirements,
      businessJustification,
      budgetRange,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    // Populate the quote request for response
    await quoteRequest.populate([
      {
        path: "items.product",
        select: "title images category price"
      },
      {
        path: "user",
        select: "name email businessDetails.companyName"
      }
    ]);

    // Create notification for quote request
    try {
      const user = await User.findById(req.user.id);
      await NotificationService.createQuoteRequestNotification(quoteRequest, user);
    } catch (notificationError) {
      console.error("Error creating quote request notification:", notificationError);
      // Don't fail the quote request if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Quote request created successfully",
      data: quoteRequest
    });
  } catch (error) {
    console.error("Create quote request error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating quote request",
    });
  }
};

// Get user's quote requests
exports.getQuoteRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const quoteRequests = await QuoteRequest.find({ user: req.user._id })
      .populate([
        {
          path: "items.product",
          select: "title images category price"
        }
      ])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalQuoteRequests = await QuoteRequest.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        quoteRequests,
        totalQuoteRequests,
        currentPage: page,
        totalPages: Math.ceil(totalQuoteRequests / limit)
      }
    });
  } catch (error) {
    console.error("Get quote requests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving quote requests",
    });
  }
};

// Get single quote request
exports.getQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const quoteRequest = await QuoteRequest.findOne({
      _id: id,
      user: req.user._id
    }).populate([
      {
        path: "items.product",
        select: "title images category price specifications"
      },
      {
        path: "quotedBy",
        select: "name email"
      }
    ]);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quoteRequest
    });
  } catch (error) {
    console.error("Get quote request error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving quote request",
    });
  }
};
