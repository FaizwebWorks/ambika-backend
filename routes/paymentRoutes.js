const express = require("express");
const router = express.Router();
const {
  createStripePaymentIntent,
  confirmStripePayment,
  createStripeCheckoutSession,
  handleStripeWebhook,
  getStripeSession
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");



// Stripe webhook (no auth required) - must be first
router.post("/stripe/webhook", express.raw({type: 'application/json'}), handleStripeWebhook);

// Stripe payment routes (for orders) - regular user access
router.use("/stripe", protect); // Only protect routes, no admin required
router.post("/stripe/create-payment-intent", createStripePaymentIntent);
router.post("/stripe/confirm-payment", confirmStripePayment);
router.post("/stripe/create-checkout-session", createStripeCheckoutSession);
router.get("/stripe/session/:sessionId", getStripeSession);

module.exports = router;
