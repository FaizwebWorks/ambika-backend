// Cache implementation using Map for in-memory caching
class MemoryCache {
  constructor(ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, customTTL = null) {
    const expiresAt = Date.now() + (customTTL || this.ttl);
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  stats() {
    return {
      size: this.cache.size,
      ttl: this.ttl
    };
  }
}

// Create cache instances
const productCache = new MemoryCache(600000); // 10 minutes for products
const categoryCache = new MemoryCache(1800000); // 30 minutes for categories
const userCache = new MemoryCache(300000); // 5 minutes for user data

// Cache middleware
const cacheMiddleware = (cache, keyGenerator, ttl = null) => {
  return (req, res, next) => {
    const key = keyGenerator(req);
    const cachedData = cache.get(key);

    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      if (res.statusCode === 200 && data.success) {
        cache.set(key, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Key generators
const keyGenerators = {
  productList: (req) => `products:${JSON.stringify(req.query)}`,
  productById: (req) => `product:${req.params.id}`,
  categories: (req) => `categories:${JSON.stringify(req.query)}`,
  categoryById: (req) => `category:${req.params.id}`,
  userProfile: (req) => `user:${req.user?.id}`
};

// Cache invalidation helpers
const cacheInvalidation = {
  invalidateProducts: () => {
    productCache.clear();
  },
  
  invalidateCategories: () => {
    categoryCache.clear();
  },
  
  invalidateUser: (userId) => {
    userCache.delete(`user:${userId}`);
  },
  
  invalidateProduct: (productId) => {
    // Remove specific product and clear product lists
    productCache.delete(`product:${productId}`);
    // Clear all product list caches (could be optimized further)
    for (const [key] of productCache.cache.entries()) {
      if (key.startsWith('products:')) {
        productCache.delete(key);
      }
    }
  }
};

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  productCache.cleanup();
  categoryCache.cleanup();
  userCache.cleanup();
}, 600000);

module.exports = {
  MemoryCache,
  productCache,
  categoryCache,
  userCache,
  cacheMiddleware,
  keyGenerators,
  cacheInvalidation
};
