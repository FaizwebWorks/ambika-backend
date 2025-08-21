const Stripe = require('stripe');

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables. Using placeholder.');
}

// Initialize Stripe with secret key (use placeholder if not set)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Stripe configuration
const stripeConfig = {
  // Test mode settings
  testMode: process.env.NODE_ENV !== 'production',
  currency: 'inr', // Indian Rupees
  
  // Webhook configuration
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Payment settings
  paymentMethodTypes: ['card'],
  
  // Success and cancel URLs
  successUrl: `${process.env.FRONTEND_URL}/order-success`,
  cancelUrl: `${process.env.FRONTEND_URL}/cart`,
};

module.exports = {
  stripe,
  stripeConfig
};
