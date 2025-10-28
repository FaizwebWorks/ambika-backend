const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', true);
    
    // Configure mongoose buffering options
    mongoose.set('bufferCommands', false); // Disable mongoose command buffering
    
    // Balanced connection options for production
    const connectionOptions = {
      // Connection stability options
      serverSelectionTimeoutMS: 10000,  // Faster timeout for better UX
      socketTimeoutMS: 45000,
      maxPoolSize: 8,   // Balanced pool size for performance vs memory
      minPoolSize: 2,   // Keep some connections alive
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      heartbeatFrequencyMS: 10000, // Ping every 10 seconds
      
      // Production-specific optimizations
      ...(process.env.NODE_ENV === 'production' && {
        maxConnecting: 2,
        retryWrites: true,
        w: 'majority',
        readPreference: 'primary',
        readConcern: { level: 'majority' }
      })
    };
    
    const conn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);

    console.log(`MongoDB connected: ${conn.connection.host}`);
    logger.info(`MongoDB connected successfully to ${conn.connection.host}`);

    // Handle connection events for better monitoring
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Will attempt to reconnect...');
      console.log('MongoDB disconnected. Will attempt to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
      console.log('MongoDB reconnected successfully');
    });

    mongoose.connection.on('close', () => {
      logger.info('MongoDB connection closed');
      console.log('MongoDB connection closed');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    console.error("MongoDB connection failed:", error.message);
    
    // In production, exit on connection failure
    // In development, retry after delay
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

module.exports = connectDB;
