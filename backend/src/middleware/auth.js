const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return error(res, 'Authentication required', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await prisma.user.findFirst({
      where: { id: decoded.id, deleted: false },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return error(res, 'User not found', 401);
    req.user = user;
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return error(res, 'Admin access required', 403);
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await prisma.user.findFirst({
        where: { id: decoded.id, deleted: false },
        select: { id: true, name: true, email: true, role: true },
      });
      req.user = user || null;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
