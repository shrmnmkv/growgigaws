import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth - Authorization header:', authHeader);
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Check if it's a Bearer token
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    console.log('Auth - Extracted token:', token ? 'Token present' : 'No token');
    
    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    try {
      // Verify token
      console.log('Auth - Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('Auth - Decoded token:', decoded);
      
      // Find user
      console.log('Auth - Finding user with ID:', decoded.userId);
      const user = await User.findById(decoded.userId).select('-password');
      console.log('Auth - Found user:', user);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (err) {
      console.error('Auth - Token verification error:', err);
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    // If no roles were specified, allow all authenticated users
    if (!roles || roles.length === 0) {
      console.log('CheckRole - No specific roles required, allowing access');
      return next();
    }
    
    console.log('CheckRole - User role:', req.user.role);
    console.log('CheckRole - Required roles:', roles);
    
    if (!roles.includes(req.user.role)) {
      console.log('CheckRole - Access denied: role not allowed');
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log('CheckRole - Access granted');
    next();
  };
};