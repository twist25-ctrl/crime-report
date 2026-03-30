/**
 * Authentication & authorisation middleware
 */

// Require any logged-in user
function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

// Require specific roles
function authorise(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (roles.length && !roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { isAuthenticated, authorise };
