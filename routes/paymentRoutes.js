const express = require("express");
const router = express.Router();
const {
  getSubscriptionPlans,
  getCurrentSubscription,
  createSubscriptionOrder,
  verifyPayment,
  cancelSubscription,
  getPaymentHistory,
  checkSubscriptionStatus
} = require("../controllers/paymentController");
const { protect, admin } = require("../middleware/auth");

// All routes require admin authentication
router.use(protect);
router.use(admin);

// Subscription management routes
router.get("/plans", getSubscriptionPlans);
router.get("/subscription", getCurrentSubscription);
router.get("/subscription/status", checkSubscriptionStatus);
router.post("/subscription/create", createSubscriptionOrder);
router.post("/subscription/verify", verifyPayment);
router.put("/subscription/cancel", cancelSubscription);
router.get("/history", getPaymentHistory);

module.exports = router;
