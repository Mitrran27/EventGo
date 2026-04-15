const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const getFavorites = async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id, deleted: false },
      include: { vendor: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, { favorites });
  } catch (e) { next(e); }
};

const addFavorite = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({ where: { id: req.params.vendorId, deleted: false } });
    if (!vendor) return error(res, 'Vendor not found', 404);
    const existing = await prisma.favorite.findFirst({ where: { userId: req.user.id, vendorId: req.params.vendorId } });
    if (existing && !existing.deleted) return error(res, 'Already in favourites', 409);
    if (existing) {
      await prisma.favorite.update({ where: { id: existing.id }, data: { deleted: false } });
    } else {
      await prisma.favorite.create({ data: { userId: req.user.id, vendorId: req.params.vendorId } });
    }
    await prisma.vendorLead.create({ data: { vendorId: req.params.vendorId, userId: req.user.id, actionType: 'FAVORITE' } }).catch(() => {});
    return success(res, {}, 'Added to favourites', 201);
  } catch (e) { next(e); }
};

const removeFavorite = async (req, res, next) => {
  try {
    const fav = await prisma.favorite.findFirst({ where: { userId: req.user.id, vendorId: req.params.vendorId, deleted: false } });
    if (!fav) return error(res, 'Favourite not found', 404);
    await prisma.favorite.update({ where: { id: fav.id }, data: { deleted: true } });
    return success(res, {}, 'Removed from favourites');
  } catch (e) { next(e); }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
