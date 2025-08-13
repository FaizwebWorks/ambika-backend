const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, admin } = require("../middleware/auth");

// Apply auth middleware to all admin routes
router.use(protect);
router.use(admin);

// Dashboard and Analytics
router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/export", adminController.exportData);

// Products Management
router.get("/products", adminController.getAdminProducts);
router.put("/products/bulk", adminController.bulkUpdateProducts);

// Orders Management
router.get("/orders", adminController.getAdminOrders);
router.put("/orders/:id/status", adminController.updateOrderStatus);

// Customers Management
router.get("/customers", adminController.getAdminCustomers);

// Categories Management
router.get("/categories", adminController.getAdminCategories);

module.exports = router;
