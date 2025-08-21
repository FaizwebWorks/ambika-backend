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

// Request timing middleware
const requestTiming = (req, res, next) => {
  const startTime = Date.now();
  
  // Add timing header before response starts
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Add timing header before sending response
    if (!res.headersSent) {
      res.set('X-Response-Time', `${duration}ms`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Memory usage monitoring
const memoryMonitoring = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  // Log high memory usage
  if (heapUsedMB > 500) { // Alert if using more than 500MB
    logger.warn('High memory usage detected', {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      url: req.url
    });
  }
  
  // Add memory headers for debugging (before response is sent)
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Used', `${heapUsedMB}MB`);
    res.set('X-Memory-Total', `${heapTotalMB}MB`);
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

// Health check endpoint
const healthCheck = (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      loadAverage: os.loadavg()
    }
  };
  
  // Check if cluster is being used
  if (cluster.isWorker) {
    health.worker = {
      id: cluster.worker.id,
      pid: process.pid
    };
  }
  
  res.json(health);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length') || 0
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
  });
  
  next();
};

// Request caching middleware
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `request:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.info('Cache hit', { url: req.url });
        return res.json(cachedResponse);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
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
