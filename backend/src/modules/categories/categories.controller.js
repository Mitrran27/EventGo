const prisma = require('../../config/db');
const { success } = require('../../utils/response');

const getVendorCategories = async (req, res, next) => {
  try {
    const categories = await prisma.vendorCategory.findMany({ where: { deleted: false }, orderBy: { name: 'asc' } });
    return success(res, { categories });
  } catch (e) { next(e); }
};

const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await prisma.expenseCategory.findMany({ where: { deleted: false }, orderBy: { name: 'asc' } });
    return success(res, { categories });
  } catch (e) { next(e); }
};

module.exports = { getVendorCategories, getExpenseCategories };
