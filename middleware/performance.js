// Performance monitoring and optimization middleware

const os = require('os');
const cluster = require('cluster');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const { CORS_OPTIONS } = require('../utils/constants');
const { getSecurityHeaders } = require('../utils/security');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

// Lightweight request timing (only for slow requests)
const requestTiming = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, only track very slow requests
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (duration > 2000) { // Only log requests > 2 seconds
        console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
      }
    });
  }
  next();
};

// Lightweight memory monitoring (only for critical situations)
const memoryMonitoring = (req, res, next) => {
  // Only check memory every 100 requests to reduce overhead
  if (Math.random() > 0.01) return next();
  
  const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
  
  // Only log if memory is critically high
  if (heapUsed > 400) {
    console.warn(`High memory: ${Math.round(heapUsed)}MB`);
  }
  
  next();
};

// Request size limiting
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length']);
      const maxBytes = parseSize(maxSize);
      
      if (contentLength > maxBytes) {
        return res.status(413).json({
          success: false,
          message: `Request too large. Maximum allowed size is ${maxSize}`
        });
      }
    }
    
    next();
  };
};

// Parse size string to bytes
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.match(/^(\d+)([a-z]+)$/i);
  
  if (!match) return parseInt(size);
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  return value * (units[unit] || 1);
};

// Gzip compression with optimization
const optimizedCompression = compression({
  level: 6, // Compression level (1-9, 6 is default)
  threshold: 1024, // Only compress if size > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Don't compress images, videos, or already compressed files
    const contentType = res.getHeader('content-type');
    if (contentType && (
      contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/gzip')
    )) {
      return false;
    }
    
    return compression.filter(req, res);
  }
});

// Security headers with helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
const corsMiddleware = cors({
  ...CORS_OPTIONS,
  optionsSuccessStatus: 200,
  preflightContinue: false
});

// Lightweight health check
const healthCheck = (req, res) => {
  const uptime = Math.floor(process.uptime() / 60);
  const memUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  
  res.json({
    status: 'healthy',
    uptime: `${uptime}m`,
    memory: `${memUsed}MB`
  });
};

// Minimal request logging (only errors and important requests)
const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, only log errors and auth requests
    res.on('finish', () => {
      if (res.statusCode >= 400 || req.url.includes('/login') || req.url.includes('/register')) {
        console.log(`${req.method} ${req.url} - ${res.statusCode}`);
      }
    });
  }
  next();
};

// Simple caching for critical endpoints only
const cacheMiddleware = (ttl = 300) => {
  const simpleCache = new Map();
  
  return (req, res, next) => {
    // Only cache specific GET endpoints to save memory
    if (req.method !== 'GET' || !req.url.includes('/api/products')) {
      return next();
    }
    
    const cacheKey = req.originalUrl;
    const cached = simpleCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function(data) {
      simpleCache.set(cacheKey, { data, timestamp: Date.now() });
      // Limit cache size
      if (simpleCache.size > 50) {
        const firstKey = simpleCache.keys().next().value;
        simpleCache.delete(firstKey);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Error boundary middleware
const errorBoundary = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error in middleware', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDevelopment && { error: err.message, stack: err.stack })
  });
};

// API versioning middleware
const apiVersioning = (req, res, next) => {
  // Get version from header or URL
  const version = req.get('API-Version') || req.params.version || 'v1';
  
  // Set version in request for controllers to use
  req.apiVersion = version;
  
  // Set response header
  res.set('API-Version', version);
  
  next();
};

// Database connection check middleware
const dbConnectionCheck = (req, res, next) => {
  const mongoose = require('mongoose');
  
  if (mongoose.connection.readyState !== 1) {
    logger.error('Database connection lost');
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable'
    });
  }
  
  next();
};

module.exports = {
  requestTiming,
  memoryMonitoring,
  requestSizeLimit,
  optimizedCompression,
  securityHeaders,
  corsMiddleware,
  healthCheck,
  requestLogger,
  cacheMiddleware,
  errorBoundary,
  apiVersioning,
  dbConnectionCheck
};
