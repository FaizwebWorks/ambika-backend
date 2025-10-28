// Minimal cache for memory optimization
class MemoryCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value) {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Simple cache instances (small memory footprint)
const productCache = new MemoryCache(20); // Only 20 products cached
const categoryCache = new MemoryCache(10); // Only 10 categories cached

// Simple cache middleware
const cacheMiddleware = (cache, keyFn) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next(); // No caching in dev
    
    const key = keyFn(req);
    const cached = cache.get(key);
    
    if (cached) return res.json(cached);
    
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) cache.set(key, data);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Simple key generators
const keyGenerators = {
  productById: (req) => `p:${req.params.id}`,
  categoryById: (req) => `c:${req.params.id}`
};

module.exports = {
  MemoryCache,
  productCache,
  categoryCache,
  cacheMiddleware,
  keyGenerators
};
