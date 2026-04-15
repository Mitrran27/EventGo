const prisma = require('../../config/db');
const { success } = require('../../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        emailVerified: true, createdAt: true,
        _count: { select: { events: true, favorites: true, contactRequests: true } },
      },
    });
    return success(res, { user });
  } catch (e) { next(e); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }) },
      select: { id: true, name: true, email: true, role: true },
    });
    return success(res, { user }, 'Profile updated');
  } catch (e) { next(e); }
};

module.exports = { getProfile, updateProfile };
