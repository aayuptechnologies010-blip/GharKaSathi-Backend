const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const Admin = require('../models/Admin');

const MODEL_BY_ROLE = { user: User, provider: ServiceProvider, admin: Admin };

function protect(...allowedRoles) {
  return async function (req, res, next) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Not authorized for this action' });
      }

      const Model = MODEL_BY_ROLE[decoded.role];
      if (!Model) {
        return res.status(401).json({ message: 'Invalid token role' });
      }

      const account = await Model.findById(decoded.id);
      if (!account || account.isActive === false) {
        return res.status(401).json({ message: 'Account not found or deactivated' });
      }

      req.role = decoded.role;
      req.account = account;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  };
}

module.exports = { protect };
