const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', true);
    
    // Configure mongoose buffering options
    mongoose.set('bufferCommands', true); // Enable mongoose command buffering for stability
    
    // Optimized connection options for fast performance
    const connectionOptions = {
      // High performance connection settings
      serverSelectionTimeoutMS: 5000,   // Faster connection selection
      socketTimeoutMS: 0,                // No socket timeout for long operations
      maxPoolSize: 20,                   // More connections for better performance
      minPoolSize: 5,                    // Keep more connections alive
      maxIdleTimeMS: 60000,              // Keep connections alive longer
      heartbeatFrequencyMS: 5000,        // More frequent health checks
      
      // Production-specific optimizations
      ...(process.env.NODE_ENV === 'production' && {
        maxConnecting: 5,                // Allow more concurrent connections
        retryWrites: true,
        w: 1,                           // Faster write acknowledgment
        readPreference: 'primaryPreferred', // Allow secondary reads for better performance
        bufferMaxEntries: 0,            // Disable mongoose command buffering
        useUnifiedTopology: true,
        useNewUrlParser: true
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
    
    // For Render, don't exit immediately - let the server start and retry
    if (process.env.RENDER) {
      console.log('Render deployment: Starting server anyway, will retry connection...');
      setTimeout(connectDB, 10000); // Retry after 10 seconds
    } else if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

module.exports = connectDB;
