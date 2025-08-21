const cluster = require('cluster');
const os = require('os');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const CLUSTER_MODE = process.env.CLUSTER_MODE === 'true';
const numCPUs = os.cpus().length;

if (CLUSTER_MODE && cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Master received SIGTERM, shutting down workers');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  process.on('SIGINT', () => {
    logger.info('Master received SIGINT, shutting down workers');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

} else {
  // Worker process
  const server = app.listen(PORT, () => {
    const workerInfo = cluster.isWorker ? `Worker ${process.pid}` : 'Server';
    logger.info(`${workerInfo} is running on port ${PORT}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${workerInfo} is running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
    }
  });

  // Graceful shutdown for workers
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      const mongoose = require('mongoose');
      mongoose.connection.close(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      });
    });

    // Force close server after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    gracefulShutdown('unhandledRejection');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  // Handle worker disconnect
  if (cluster.isWorker) {
    process.on('disconnect', () => {
      logger.info('Worker disconnected from master');
      gracefulShutdown('disconnect');
    });
  }

  // Export server for testing
  module.exports = server;
}