// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/auth');
const User = require('../models/User');
const mongoose = require('mongoose');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    
    // Branch-specific permission check
    const branchId = req.params.branchId || req.query.branchId;
    
    if (branchId) {
      console.log(`Checking access for branch: ${branchId}`);
      
      // Allow full access for owners and users with branch management
      if (decoded.role === 'owner' || (decoded.permissions && decoded.permissions.manageBranches)) {
        console.log("User has full branch access");
        return next();
      }
      
      // Check for branch-specific permissions
      const path = req.path.toLowerCase();
      
      // For menu access
      if (path.includes('menu') && 
          decoded.branchPermissions && 
          decoded.branchPermissions.menu && 
          Array.isArray(decoded.branchPermissions.menu)) {
        
        const branchIds = decoded.branchPermissions.menu.map(id => id.toString());
        console.log("User menu branch permissions:", branchIds);
        
        if (branchIds.includes(branchId.toString())) {
          console.log("Branch menu permission granted");
          return next();
        }
      }
      
      // For table access
      if (path.includes('table') && 
          decoded.branchPermissions && 
          decoded.branchPermissions.tables && 
          Array.isArray(decoded.branchPermissions.tables)) {
        
        const branchIds = decoded.branchPermissions.tables.map(id => id.toString());
        
        if (branchIds.includes(branchId.toString())) {
          console.log("Branch table permission granted");
          return next();
        }
      }
      
      // If we get here, no branch permission found
      console.log("Branch permission denied");
      return res.status(403).json({ message: 'Not authorized for this branch' });
    }
    
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};