import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes."
  },
  keyGenerator: (req) => {
    // Strip the port from the IP if present (fix for ERR_ERL_INVALID_IP_ADDRESS)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return ip.split(':')[0].split(',')[0].trim();
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Stricter limiter for Login/Auth: 10 attempts per 15 minutes


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 4,                  // 10 failed attempts
  skipSuccessfulRequests: true, // Successful logins are not counted
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return ip.split(':')[0].split(',')[0].trim();
  },
  message: {
    success: false,
    error: "Too many login attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed limiter for images/assets: 500 requests per 15 minutes
export const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
