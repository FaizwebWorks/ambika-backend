const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, admin } = require("../middleware/auth");
const { checkSubscriptionWithGrace } = require("../middleware/subscription");

// Apply auth middleware to all admin routes
router.use(protect);
router.use(admin);
// Check subscription for admin access (with grace period)
router.use(checkSubscriptionWithGrace);

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
router.get("/customers/:customerId", adminController.getCustomerById);
router.put("/customers/:customerId/approve", adminController.approveCustomer);
router.put("/customers/:customerId/reject", adminController.rejectCustomer);

// Categories Management
router.get("/categories", adminController.getAdminCategories);

// User Management
router.get("/users", adminController.getAllUsers);
router.put("/users/:userId/role", adminController.updateUserRole);
router.delete("/users/:userId", adminController.deleteUser);

module.exports = router;
