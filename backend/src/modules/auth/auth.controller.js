const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const { signToken } = require('../../utils/jwt');
const { success, error } = require('../../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, 'Email already registered', 409);
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = signToken({ id: user.id, role: user.role });
    return success(res, { user, token }, 'Registration successful', 201);
  } catch (e) { next(e); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await prisma.user.findFirst({ where: { email, deleted: false } });

    if (!user) {
      // Auto-create account on first login with any credentials
      const hashed = await bcrypt.hash(password, 10);
      const name = email.split('@')[0]; // derive a default name from email
      user = await prisma.user.create({
        data: { name, email, password: hashed, role: 'USER', emailVerified: true },
      });
    } else if (!(await bcrypt.compare(password, user.password))) {
      return error(res, 'Invalid email or password', 401);
    }

    const token = signToken({ id: user.id, role: user.role });
    const { password: _, ...userData } = user;
    return success(res, { user: userData, token }, 'Login successful');
  } catch (e) { next(e); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
    });
    return success(res, { user });
  } catch (e) { next(e); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return error(res, 'Current password is incorrect', 400);
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    return success(res, {}, 'Password updated successfully');
  } catch (e) { next(e); }
};

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await prisma.user.findFirst({ where: { email, deleted: false } });

    if (!user) {
      // Auto-create admin account on first login
      const hashed = await bcrypt.hash(password, 10);
      const name = email.split('@')[0];
      user = await prisma.user.create({
        data: { name, email, password: hashed, role: 'ADMIN', emailVerified: true },
      });
    } else if (!(await bcrypt.compare(password, user.password))) {
      return error(res, 'Invalid email or password', 401);
    } else if (user.role !== 'ADMIN') {
      return error(res, 'Admin access only', 403);
    }

    const token = signToken({ id: user.id, role: user.role });
    const { password: _, ...userData } = user;
    return success(res, { user: userData, token }, 'Login successful');
  } catch (e) { next(e); }
};

module.exports = { register, login, adminLogin, getMe, changePassword };
