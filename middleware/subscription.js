const Subscription = require('../models/subscription');

// Middleware to check if admin has active subscription
exports.checkSubscription = async (req, res, next) => {
  try {
    // Only check subscription for admin users
    if (req.user.role !== 'admin') {
      return next();
    }

    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });
    
    // Check if subscription exists and is active
    if (!subscription || !subscription.isActive()) {
      return res.status(403).json({
        success: false,
        message: "Active subscription required to access admin features",
        code: "SUBSCRIPTION_REQUIRED",
        data: {
          hasSubscription: !!subscription,
          isExpired: subscription ? !subscription.isActive() : false,
          endDate: subscription ? subscription.endDate : null
        }
      });
    }
    
    // Add subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription status",
      error: error.message
    });
  }
};

// Middleware for subscription grace period (allow access for 3 days after expiry)
exports.checkSubscriptionWithGrace = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next();
    }

    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({
      user: userId
    }).sort({ createdAt: -1 });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "Subscription required to access admin features",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }
    
    // Check if subscription is active or within grace period (3 days)
    const gracePeriodEnd = new Date(subscription.endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
    
    const now = new Date();
    
    if (subscription.status === 'active' && subscription.endDate > now) {
      // Active subscription
      req.subscription = subscription;
      return next();
    } else if (subscription.status === 'active' && now <= gracePeriodEnd) {
      // Grace period
      req.subscription = subscription;
      req.inGracePeriod = true;
      return next();
    }
    
    // Subscription expired
    return res.status(403).json({
      success: false,
      message: "Subscription has expired. Please renew to continue using admin features.",
      code: "SUBSCRIPTION_EXPIRED",
      data: {
        endDate: subscription.endDate,
        gracePeriodEnd: gracePeriodEnd
      }
    });
  } catch (error) {
    console.error("Error checking subscription with grace:", error);
    res.status(500).json({
      success: false,
      message: "Error checking subscription status",
      error: error.message
    });
  }
};
