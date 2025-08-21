const express = require("express");
const router = express.Router();
const {
  getSubscriptionPlans,
  getCurrentSubscription,
  createSubscriptionOrder,
  verifyPayment,
  cancelSubscription,
  getPaymentHistory,
  checkSubscriptionStatus,
  // Stripe methods
  createStripePaymentIntent,
  confirmStripePayment,
  createStripeCheckoutSession,
  handleStripeWebhook,
  getStripeSession
} = require("../controllers/paymentController");
const { protect, admin } = require("../middleware/auth");


// Stripe webhook (no auth required) - must be first
router.post("/stripe/webhook", express.raw({type: 'application/json'}), handleStripeWebhook);

// Stripe payment routes (for orders) - regular user access
router.use("/stripe", protect); // Only protect routes, no admin required
router.post("/stripe/create-payment-intent", createStripePaymentIntent);
router.post("/stripe/confirm-payment", confirmStripePayment);
router.post("/stripe/create-checkout-session", createStripeCheckoutSession);
router.get("/stripe/session/:sessionId", getStripeSession);

// Subscription management routes - admin only
router.use(protect);
router.use(admin);
router.get("/plans", getSubscriptionPlans);
router.get("/subscription", getCurrentSubscription);
router.get("/subscription/status", checkSubscriptionStatus);
router.post("/subscription/create", createSubscriptionOrder);
router.post("/subscription/verify", verifyPayment);
router.put("/subscription/cancel", cancelSubscription);
router.get("/history", getPaymentHistory);

module.exports = router;
