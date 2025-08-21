// Security utilities for enhanced application security

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { REGEX_PATTERNS, JWT_CONFIG } = require('./constants');

// Generate secure random string
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT tokens
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY
  });
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY
  });
  
  return { accessToken, refreshToken };
};

// Verify JWT token
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate password reset token
const generatePasswordResetToken = (userId) => {
  return jwt.sign({ userId, type: 'password_reset' }, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.PASSWORD_RESET_EXPIRY
  });
};

// Generate email verification token
const generateEmailVerificationToken = (email) => {
  return jwt.sign({ email, type: 'email_verification' }, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.EMAIL_VERIFICATION_EXPIRY
  });
};

// Sanitize HTML input
const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitize SQL input (for NoSQL injection prevention)
const sanitizeNoSQL = (input) => {
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeNoSQL);
    }
    
    const sanitized = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        const sanitizedKey = key.replace(/^\$/, '');
        sanitized[sanitizedKey] = sanitizeNoSQL(input[key]);
      }
    }
    return sanitized;
  }
  
  if (typeof input === 'string') {
    return input.replace(/\$/g, '');
  }
  
  return input;
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const maxLength = 128;
  
  if (password.length < minLength || password.length > maxLength) {
    return {
      isValid: false,
      message: `Password must be between ${minLength} and ${maxLength} characters`
    };
  }
  
  if (!REGEX_PATTERNS.PASSWORD.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      message: 'Password is too common. Please choose a stronger password'
    };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

// Rate limiting key generator
const generateRateLimitKey = (ip, userId = null, endpoint = null) => {
  const baseKey = `rate_limit:${ip}`;
  
  if (userId) {
    return `${baseKey}:user:${userId}`;
  }
  
  if (endpoint) {
    return `${baseKey}:endpoint:${endpoint}`;
  }
  
  return baseKey;
};

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

// Verify CSRF token
const verifyCSRFToken = (token, sessionToken) => {
  return crypto.timingSafeEqual(
    Buffer.from(token, 'base64'),
    Buffer.from(sessionToken, 'base64')
  );
};

// Encrypt sensitive data
const encryptData = (data, key = process.env.ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt sensitive data
const decryptData = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, key);
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Mask sensitive data for logging
const maskSensitiveData = (data, fields = []) => {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'email', 'phone',
    'cardNumber', 'cvv', 'ssn', 'bankAccount', ...fields
  ];
  
  const masked = { ...data };
  
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      if (field === 'email') {
        const [username, domain] = masked[field].split('@');
        masked[field] = `${username.charAt(0)}***@${domain}`;
      } else if (field === 'phone') {
        masked[field] = `***${masked[field].slice(-4)}`;
      } else {
        masked[field] = '***';
      }
    }
  });
  
  return masked;
};

// Generate secure session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate IP address
const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Check if request is from allowed origin
const isAllowedOrigin = (origin, allowedOrigins) => {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
};

// Generate API key
const generateAPIKey = (prefix = 'ak') => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
};

// Hash API key for storage
const hashAPIKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Verify API key
const verifyAPIKey = (apiKey, hashedKey) => {
  const hashedInput = hashAPIKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(hashedInput, 'hex'),
    Buffer.from(hashedKey, 'hex')
  );
};

// Security headers middleware
const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
};

module.exports = {
  generateSecureToken,
  hashPassword,
  comparePassword,
  generateTokens,
  verifyToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  sanitizeHTML,
  sanitizeNoSQL,
  validatePasswordStrength,
  generateRateLimitKey,
  generateCSRFToken,
  verifyCSRFToken,
  encryptData,
  decryptData,
  maskSensitiveData,
  generateSessionId,
  isValidIP,
  isAllowedOrigin,
  generateAPIKey,
  hashAPIKey,
  verifyAPIKey,
  getSecurityHeaders
};
