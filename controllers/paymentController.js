const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/subscription');
const User = require('../models/user');
const Order = require('../models/order');
const stripeService = require('../services/stripeService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Subscription plans
const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic Plan",
    price: 1999,
    currency: "INR",
    duration: 30,
    features: [
      "Basic Dashboard Access",
      "Product Management",
      "Order Management",
      "Customer Support"
    ]
  },
  professional: {
    name: "Professional Plan",
    price: 3999,
    currency: "INR", 
    duration: 30,
    features: [
      "Full Dashboard Access",
      "Advanced Analytics",
      "Inventory Management",
      "Customer Management",
      "B2B Features",
      "Priority Support",
      "Data Export"
    ]
  },
  enterprise: {
    name: "Enterprise Plan",
    price: 7999,
    currency: "INR",
    duration: 30,
    features: [
      "Complete Business Suite",
      "Advanced Reports",
      "Multi-user Access",
      "API Access",
      "Custom Integrations",
      "24/7 Support",
      "White-label Options"
    ]
  }
};

// Get subscription plans
exports.getSubscriptionPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      data: SUBSCRIPTION_PLANS
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription plans",
      error: error.message
    });
  }
};

// Get current subscription
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({ 
      user: userId 
    }).sort({ createdAt: -1 });
    
    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: "No subscription found"
      });
    }
    
    const subscriptionData = {
      ...subscription.toObject(),
      isActive: subscription.isActive(),
      isExpiringSoon: subscription.isExpiringSoon(),
      daysRemaining: subscription.getDaysRemaining()
    };
    
    res.json({
      success: true,
      data: subscriptionData
    });
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching current subscription",
      error: error.message
    });
  }
};

// Create subscription order
exports.createSubscriptionOrder = async (req, res) => {
  try {
    const { planType } = req.body;
    const userId = req.user.id;
    
    if (!SUBSCRIPTION_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }
    
    const plan = SUBSCRIPTION_PLANS[planType];
    
    // Create Razorpay order
    const orderOptions = {
      amount: plan.price * 100, // Amount in paise
      currency: plan.currency,
      receipt: `sub_${userId}_${Date.now()}`,
      notes: {
        planType,
        userId,
        planName: plan.name
      }
    };
    
    const razorpayOrder = await razorpay.orders.create(orderOptions);
    
    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration);
    
    // Create subscription record
    const subscription = new Subscription({
      user: userId,
      plan: planType,
      planDetails: plan,
      amount: plan.price,
      startDate,
      endDate,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending'
    });
    
    await subscription.save();
    
    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        subscription: subscription,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error("Error creating subscription order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating subscription order",
      error: error.message
    });
  }
};

// Verify payment and activate subscription
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }
    
    // Find and update subscription
    const subscription = await Subscription.findOne({
      razorpayOrderId: razorpay_order_id
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }
    
    // Update subscription
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.paymentStatus = 'completed';
    subscription.paymentDate = new Date();
    subscription.status = 'active';
    
    // Add to payment history
    subscription.paymentHistory.push({
      amount: subscription.amount,
      status: 'completed',
      razorpayPaymentId: razorpay_payment_id,
      description: `Payment for ${subscription.planDetails.name}`
    });
    
    await subscription.save();
    
    // Update user's subscription status
    await User.findByIdAndUpdate(subscription.user, {
      subscriptionStatus: 'active',
      subscriptionEndDate: subscription.endDate
    });
    
    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      data: subscription
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found"
      });
    }
    
    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();
    
    // Update user status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'cancelled'
    });
    
    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      data: subscription
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
      error: error.message
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscriptions = await Subscription.find({ 
      user: userId 
    }).sort({ createdAt: -1 });
    
    const paymentHistory = [];
    
    subscriptions.forEach(sub => {
      sub.paymentHistory.forEach(payment => {
        paymentHistory.push({
          ...payment.toObject(),
          plan: sub.planDetails.name,
          subscriptionId: sub._id
        });
      });
    });
    
    // Sort by date descending
    paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      data: paymentHistory
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history",
      error: error.message
    });
  }
};

// Check subscription status (middleware helper)
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });
    
    const hasActiveSubscription = subscription && subscription.isActive();
    
    res.json({
      success: true,
      data: {
        hasActiveSubscription,
        subscription: subscription ? {
          ...subscription.toObject(),
          isActive: subscription.isActive(),
          isExpiringSoon: subscription.isExpiringSoon(),
          daysRemaining: subscription.getDaysRemaining()
        } : null
      }
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription status",
      error: error.message
    });
  }
};

// ============ STRIPE PAYMENT METHODS ============

// Create Stripe payment intent for order
exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Find the order
    const order = await Order.findById(orderId).populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify order belongs to user
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to order"
      });
    }
    
    const orderData = {
      total: order.pricing.total,
      customerInfo: {
        email: order.customerInfo.email,
        name: order.customerInfo.name,
      },
      orderId: order._id.toString(),
    };
    
    const paymentIntent = await stripeService.createPaymentIntent(orderData);
    
    // Update order with payment intent
    order.payment.stripePaymentIntentId = paymentIntent.paymentIntentId;
    order.payment.status = 'pending';
    await order.save();
    
    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      }
    });
  } catch (error) {
    console.error("Error creating Stripe payment intent:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment intent",
      error: error.message
    });
  }
};

// Confirm Stripe payment
exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    
    // Verify payment with Stripe
    const paymentConfirmation = await stripeService.confirmPayment(paymentIntentId);
    
    if (paymentConfirmation.status === 'succeeded') {
      // Update order status
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }
      
      order.payment.status = 'completed';
      order.payment.method = 'stripe';
      order.payment.transactionId = paymentIntentId;
      order.payment.paidAt = new Date();
      order.status = 'confirmed';
      
      await order.save();
      
      res.json({
        success: true,
        message: "Payment confirmed successfully",
        data: {
          orderId: order._id,
          paymentStatus: 'completed',
          transactionId: paymentIntentId,
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment not completed",
        data: {
          status: paymentConfirmation.status
        }
      });
    }
  } catch (error) {
    console.error("Error confirming Stripe payment:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming payment",
      error: error.message
    });
  }
};

// Create Stripe checkout session
exports.createStripeCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Find the order with populated product details
    const order = await Order.findById(orderId).populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify order belongs to user
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to order"
      });
    }
    
    const orderData = {
      items: order.items,
      total: order.pricing.total,
      customerInfo: {
        email: order.customerInfo.email,
        name: order.customerInfo.name,
      },
      orderId: order._id.toString(),
    };
    
    const checkoutSession = await stripeService.createCheckoutSession(orderData);
    
    // Update order with session info
    order.payment.stripeSessionId = checkoutSession.sessionId;
    order.payment.status = 'pending';
    await order.save();
    
    res.json({
      success: true,
      data: {
        sessionId: checkoutSession.sessionId,
        url: checkoutSession.url,
      }
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({
      success: false,
      message: "Error creating checkout session",
      error: error.message
    });
  }
};

// Handle Stripe webhook
exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    const event = await stripeService.handleWebhook(req.body, signature);
    
    switch (event.type) {
      case 'payment_succeeded':
        // Handle successful payment
        const paymentIntentId = event.data.id;
        const order = await Order.findOne({
          'payment.stripePaymentIntentId': paymentIntentId
        });
        
        if (order) {
          order.payment.status = 'completed';
          order.status = 'confirmed';
          order.payment.paidAt = new Date();
          await order.save();
        }
        break;
        
      case 'checkout_completed':
        // Handle checkout session completion
        const sessionId = event.data.id;
        const sessionOrder = await Order.findOne({
          'payment.stripeSessionId': sessionId
        });
        
        if (sessionOrder) {
          sessionOrder.payment.status = 'completed';
          sessionOrder.status = 'confirmed';
          sessionOrder.payment.paidAt = new Date();
          await sessionOrder.save();
        }
        break;
        
      case 'payment_failed':
        // Handle failed payment
        console.log('Payment failed:', event.data);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({
      success: false,
      message: "Webhook error",
      error: error.message
    });
  }
};

// Get Stripe session details
exports.getStripeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionDetails = await stripeService.getSession(sessionId);
    
    res.json({
      success: true,
      data: sessionDetails
    });
  } catch (error) {
    console.error("Error fetching Stripe session:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching session details",
      error: error.message
    });
  }
};
