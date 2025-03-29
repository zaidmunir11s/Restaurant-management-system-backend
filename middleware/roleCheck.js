// middleware/roleCheck.js
// Check if user has required role
exports.checkRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      next();
    };
  };