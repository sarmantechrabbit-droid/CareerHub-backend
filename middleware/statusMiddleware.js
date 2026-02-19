const User = require('../models/User');

/**
 * Middleware to check if the user account is Active.
 * This should be used AFTER the 'protect' middleware.
 */
const isActive = async (req, res, next) => {
  try {
    // req.user is already populated by 'protect' middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.status !== 'Active' && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Your account is not active. Please contact the administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('isActive middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { isActive };
