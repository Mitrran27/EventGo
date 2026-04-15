const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const getVendors = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;
    const where = { deleted: false, isActive: true };
    if (category) where.categoryId = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (minPrice) where.minPrice = { gte: Number(minPrice) };
    if (maxPrice) where.maxPrice = { lte: Number(maxPrice) };
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: { category: true, _count: { select: { leads: true, favorites: true } } },
        orderBy: { leads: { _count: 'asc' } },
        skip,
        take,
      }),
      prisma.vendor.count({ where }),
    ]);
    if (req.user) {
      await Promise.all(
        vendors.map(v =>
          prisma.vendorLead.create({ data: { vendorId: v.id, userId: req.user.id, actionType: 'VIEW' } }).catch(() => {})
        )
      );
    }
    return success(res, { vendors, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) { next(e); }
};

const getVendor = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, deleted: false, isActive: true },
      include: { category: true, _count: { select: { leads: true } } },
    });
    if (!vendor) return error(res, 'Vendor not found', 404);
    if (req.user) {
      await prisma.vendorLead.create({ data: { vendorId: vendor.id, userId: req.user.id, actionType: 'VIEW' } }).catch(() => {});
    }
    return success(res, { vendor });
  } catch (e) { next(e); }
};

module.exports = { getVendors, getVendor };
