const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, service, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] [${service || 'ambika-api'}]: ${stack || message}`;
  })
);

// Ultra lightweight logger for production
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'warn', // Only errors in production
  format: winston.format.simple(), // Simple format to save memory
  defaultMeta: { service: 'ambika-api' },
  transports: process.env.NODE_ENV === 'production' ? [
    // Production: Only log errors to a single file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 1048576, // 1MB only
      maxFiles: 1,      // Only 1 file
    }),
  ] : [
    // Development: More detailed logging
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 2097152,
      maxFiles: 2,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 2097152,
      maxFiles: 2,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
