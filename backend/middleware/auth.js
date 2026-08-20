import jwt from 'jsonwebtoken';

/**
 * Extract JWT from request
 */
const extractToken = (req) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

/**
 * Middleware: Require valid JWT authentication
 */
export const requireAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again',
      });
    }

    return res.status(403).json({
      error: 'Invalid token',
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware: Optional auth (doesn't fail if token missing)
 */
export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.isAuthenticated = true;
    } catch (error) {
      // Silently ignore token errors in optional auth
      req.isAuthenticated = false;
    }
  } else {
    req.isAuthenticated = false;
  }

  next();
};

/**
 * Create JWT token
 */
export const createToken = (userId, email) => {
  const expiresIn = process.env.JWT_EXPIRY || '24h';

  return jwt.sign(
    {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn }
  );
};

/**
 * Get client IP address (handles proxies)
 */
export const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    'unknown'
  );
};

export default {
  requireAuth,
  optionalAuth,
  createToken,
  getClientIp,
};
