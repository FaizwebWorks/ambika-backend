// Rate limiting middleware with multiple strategies

const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const { RATE_LIMITS, ERROR_MESSAGES } = require('../utils/constants');
const { generateRateLimitKey } = require('../utils/security');
const logger = require('../utils/logger');

// Create MongoDB store for rate limiting (for production)
const createMongoStore = () => {
  // Temporarily use memory store to fix startup issues
  // TODO: Re-enable MongoDB store after testing
  return null;
  
  // if (process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  //   return new MongoStore({
  //     uri: process.env.MONGODB_URI,
  //     collectionName: 'rate_limits',
  //     expireTimeMs: 15 * 60 * 1000 // 15 minutes
  //   });
  // }
  // return null;
};

// General API rate limiting
const generalRateLimit = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs,
  max: RATE_LIMITS.GENERAL.max,
  store: createMongoStore(),
  keyGenerator: (req) => {
    // Simplified key generation to avoid route path issues
    return `${req.ip}:${req.user?.id || 'anonymous'}`;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.round(RATE_LIMITS.GENERAL.windowMs / 1000)
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  store: createMongoStore(),
  keyGenerator: (req) => {
    // Use email if provided in body, otherwise use IP
    const email = req.body?.email;
    return email ? `auth:${email}` : `auth:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: Math.round(RATE_LIMITS.AUTH.windowMs / 1000)
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API rate limiting for authenticated users
const apiRateLimit = rateLimit({
  windowMs: RATE_LIMITS.API.windowMs,
  max: RATE_LIMITS.API.max,
  store: createMongoStore(),
  keyGenerator: (req) => {
    return `api:${req.ip}:${req.user?.id || 'anonymous'}`;
  },
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.round(RATE_LIMITS.API.windowMs / 1000)
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Dynamic rate limiting based on user role
const dynamicRateLimit = (options = {}) => {
  return (req, res, next) => {
    const user = req.user;
    let maxRequests = RATE_LIMITS.GENERAL.max;
    
    // Increase limits for premium users or admins
    if (user) {
      switch (user.role) {
        case 'admin':
          maxRequests = options.adminMax || 1000;
          break;
        case 'b2b_customer':
          maxRequests = options.b2bMax || 300;
          break;
        case 'customer':
          maxRequests = options.customerMax || 150;
          break;
        default:
          maxRequests = RATE_LIMITS.GENERAL.max;
      }
    }
    
    const dynamicLimit = rateLimit({
      windowMs: options.windowMs || RATE_LIMITS.GENERAL.windowMs,
      max: maxRequests,
      store: createMongoStore(),
      keyGenerator: (req) => {
        return `dynamic:${req.ip}:${req.user?.id || 'anonymous'}`;
      },
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.round((options.windowMs || RATE_LIMITS.GENERAL.windowMs) / 1000)
        });
      }
    });
    
    dynamicLimit(req, res, next);
  };
};

// Rate limiting for file uploads
const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per window
  store: createMongoStore(),
  keyGenerator: (req) => {
    return `upload:${req.ip}:${req.user?.id || 'anonymous'}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many upload attempts. Please try again later.',
      retryAfter: 600
    });
  }
});

// Rate limiting for password reset requests
const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  store: createMongoStore(),
  keyGenerator: (req) => {
    const email = req.body?.email;
    return email ? `password-reset:${email}` : `password-reset:${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests. Please try again later.',
      retryAfter: 3600
    });
  }
});

// Rate limiting for search requests
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  store: createMongoStore(),
  keyGenerator: (req) => {
    return `search:${req.ip}:${req.user?.id || 'anonymous'}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many search requests. Please slow down.',
      retryAfter: 60
    });
  }
});

// IP-based blocking middleware
const ipBlocking = (req, res, next) => {
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  
  if (blockedIPs.includes(req.ip)) {
    logger.warn('Blocked IP attempted access', { ip: req.ip });
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// Slowdown middleware for suspicious activity
const createSlowDown = require('express-slow-down');

const suspiciousActivitySlowDown = createSlowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  store: createMongoStore(),
  keyGenerator: (req) => {
    return req.ip;
  }
});

module.exports = {
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  dynamicRateLimit,
  uploadRateLimit,
  passwordResetRateLimit,
  searchRateLimit,
  ipBlocking,
  suspiciousActivitySlowDown
};
