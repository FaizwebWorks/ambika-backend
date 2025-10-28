require("dotenv").config();
const cors = require("cors");
const express = require("express");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

// Import optimized middleware
const {
  requestTiming,
  memoryMonitoring,
  requestSizeLimit,
  optimizedCompression,
  securityHeaders,
  corsMiddleware,
  healthCheck,
  requestLogger,
  dbConnectionCheck,
  apiVersioning
} = require("./middleware/performance");

const {
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  ipBlocking
} = require("./middleware/rateLimiting");

const { errorHandler } = require("./middleware/errorHandler");

// Import routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Initialize express app
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Connect to database
connectDB();

// Security and performance middleware (order matters)
// app.use(ipBlocking); // Block malicious IPs first - temporarily disabled
app.use(requestTiming); // Track request timing
app.use(memoryMonitoring); // Monitor memory usage
app.use(requestSizeLimit('50mb')); // Limit request size
app.use(optimizedCompression); // Compress responses
app.use(securityHeaders); // Security headers

// CORS configuration for both production and development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://ambika-frontend.vercel.app/', // Production frontend
      'https://ambika-international-ixiy2810o-faizwebworks-projects.vercel.app/', // New production frontend
      'http://localhost:5173',              // Development frontend
      'http://localhost:3000',              // Alternative dev port
      'http://127.0.0.1:5173',             // Alternative localhost
      process.env.FRONTEND_URL             // Environment variable
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// app.use(corsMiddleware); // Remove custom CORS middleware for deployment

// Skip body parsing for routes that use multer (FormData)
app.use((req, res, next) => {
  // Skip JSON parsing for category and product routes that use FormData
  if (req.path.startsWith('/api/categories') || req.path.startsWith('/api/products')) {
    return next();
  }
  // Apply JSON parsing for other routes
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Skip URL-encoded parsing for category and product routes that use FormData
  if (req.path.startsWith('/api/categories') || req.path.startsWith('/api/products')) {
    return next();
  }
  // Apply URL-encoded parsing for other routes
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

app.use(dbConnectionCheck); // Check DB connection
// app.use(apiVersioning); // API versioning - temporarily disabled

// Rate limiting
// app.use(generalRateLimit); // General rate limiting - temporarily disabled

// Request logging - Only in development and production (not test)
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Enable rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use(generalRateLimit);
  app.use("/api/users/login", authRateLimit);
  app.use("/api/users/register", authRateLimit);
  app.use("/api/users/forgot-password", authRateLimit);
}

// Authentication routes with stricter rate limiting
// app.use("/api/users/login", authRateLimit); // temporarily disabled
// app.use("/api/users/register", authRateLimit); // temporarily disabled
// app.use("/api/users/forgot-password", authRateLimit); // temporarily disabled

// API routes with standard rate limiting
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint (no rate limiting)
app.get("/health", healthCheck);

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "Ambika B2B API",
    version: "1.0.0",
    description: "REST API for Ambika B2B platform",
    endpoints: {
      health: "/health",
      users: "/api/users",
      products: "/api/products",
      categories: "/api/categories",
      orders: "/api/orders",
      admin: "/api/admin",
      cart: "/api/cart",
      settings: "/api/settings",
      payments: "/api/payments",
      notifications: "/api/notifications"
    }
  });
});

// 404 handler for unknown routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't exit in development for better debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Don't exit in development for better debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = app;
