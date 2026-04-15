const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const log = (adminId, action, targetType, targetId) =>
  prisma.adminLog.create({ data: { adminId, action, targetType, targetId } }).catch(() => {});

// DASHBOARD
const getDashboard = async (req, res, next) => {
  try {
    const [users, events, vendors, leads, contacts] = await Promise.all([
      prisma.user.count({ where: { deleted: false, role: 'USER' } }),
      prisma.event.count({ where: { deleted: false } }),
      prisma.vendor.count({ where: { deleted: false } }),
      prisma.vendorLead.count(),
      prisma.contactRequest.count({ where: { deleted: false } }),
    ]);
    const leadsByType = await prisma.vendorLead.groupBy({ by: ['actionType'], _count: true });
    const topVendors = await prisma.vendor.findMany({
      where: { deleted: false },
      include: { _count: { select: { leads: true } } },
      orderBy: { leads: { _count: 'desc' } },
      take: 5,
    });
    return success(res, { stats: { users, events, vendors, leads, contacts }, leadsByType, topVendors });
  } catch (e) { next(e); }
};

// USERS
const getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = { deleted: false };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, deleted: true, _count: { select: { events: true, leads: true } } }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.user.count({ where }),
    ]);
    return success(res, { users, total });
  } catch (e) { next(e); }
};

const toggleUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return error(res, 'User not found', 404);
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { deleted: !user.deleted } });
    await log(req.user.id, updated.deleted ? 'DISABLE_USER' : 'ENABLE_USER', 'user', req.params.id);
    return success(res, {}, updated.deleted ? 'User disabled' : 'User enabled');
  } catch (e) { next(e); }
};

const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) return error(res, 'Invalid role', 400);
    await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    await log(req.user.id, 'CHANGE_ROLE', 'user', req.params.id);
    return success(res, {}, 'Role updated');
  } catch (e) { next(e); }
};

// VENDORS
const getVendors = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const where = { deleted: false };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (category) where.categoryId = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({ where, include: { category: true, _count: { select: { leads: true } } }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.vendor.count({ where }),
    ]);
    return success(res, { vendors, total });
  } catch (e) { next(e); }
};

const createVendor = async (req, res, next) => {
  try {
    const { name, categoryId, description, minPrice, maxPrice, location, imageUrl } = req.body;
    const vendor = await prisma.vendor.create({ data: { name, categoryId, description, minPrice, maxPrice, location, imageUrl }, include: { category: true } });
    await log(req.user.id, 'CREATE_VENDOR', 'vendor', vendor.id);
    return success(res, { vendor }, 'Vendor created', 201);
  } catch (e) { next(e); }
};

const updateVendor = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!vendor) return error(res, 'Vendor not found', 404);
    const { name, categoryId, description, minPrice, maxPrice, location, imageUrl } = req.body;
    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(categoryId && { categoryId }), ...(description !== undefined && { description }), ...(minPrice !== undefined && { minPrice }), ...(maxPrice !== undefined && { maxPrice }), ...(location !== undefined && { location }), ...(imageUrl !== undefined && { imageUrl }) },
      include: { category: true },
    });
    await log(req.user.id, 'UPDATE_VENDOR', 'vendor', req.params.id);
    return success(res, { vendor: updated }, 'Vendor updated');
  } catch (e) { next(e); }
};

const deleteVendor = async (req, res, next) => {
  try {
    await prisma.vendor.update({ where: { id: req.params.id }, data: { deleted: true } });
    await log(req.user.id, 'DELETE_VENDOR', 'vendor', req.params.id);
    return success(res, {}, 'Vendor deleted');
  } catch (e) { next(e); }
};

const toggleVendor = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) return error(res, 'Vendor not found', 404);
    const updated = await prisma.vendor.update({ where: { id: req.params.id }, data: { isActive: !vendor.isActive } });
    return success(res, {}, updated.isActive ? 'Vendor activated' : 'Vendor deactivated');
  } catch (e) { next(e); }
};

// CATEGORIES
const getVendorCategories = async (req, res, next) => {
  try { return success(res, { categories: await prisma.vendorCategory.findMany({ where: { deleted: false }, orderBy: { name: 'asc' } }) }); } catch (e) { next(e); }
};
const createVendorCategory = async (req, res, next) => {
  try { return success(res, { category: await prisma.vendorCategory.create({ data: { name: req.body.name } }) }, 'Created', 201); } catch (e) { next(e); }
};
const updateVendorCategory = async (req, res, next) => {
  try { return success(res, { category: await prisma.vendorCategory.update({ where: { id: req.params.id }, data: { name: req.body.name } }) }); } catch (e) { next(e); }
};
const deleteVendorCategory = async (req, res, next) => {
  try { await prisma.vendorCategory.update({ where: { id: req.params.id }, data: { deleted: true } }); return success(res, {}, 'Deleted'); } catch (e) { next(e); }
};

const getExpenseCategories = async (req, res, next) => {
  try { return success(res, { categories: await prisma.expenseCategory.findMany({ where: { deleted: false }, orderBy: { name: 'asc' } }) }); } catch (e) { next(e); }
};
const createExpenseCategory = async (req, res, next) => {
  try { return success(res, { category: await prisma.expenseCategory.create({ data: { name: req.body.name } }) }, 'Created', 201); } catch (e) { next(e); }
};
const updateExpenseCategory = async (req, res, next) => {
  try { return success(res, { category: await prisma.expenseCategory.update({ where: { id: req.params.id }, data: { name: req.body.name } }) }); } catch (e) { next(e); }
};
const deleteExpenseCategory = async (req, res, next) => {
  try { await prisma.expenseCategory.update({ where: { id: req.params.id }, data: { deleted: true } }); return success(res, {}, 'Deleted'); } catch (e) { next(e); }
};

// LEADS
const getLeads = async (req, res, next) => {
  try {
    const { vendorId, actionType, page = 1, limit = 30 } = req.query;
    const where = {};
    if (vendorId) where.vendorId = vendorId;
    if (actionType) where.actionType = actionType;
    const skip = (Number(page) - 1) * Number(limit);
    const [leads, total] = await Promise.all([
      prisma.vendorLead.findMany({ where, include: { vendor: { select: { name: true } }, user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.vendorLead.count({ where }),
    ]);
    return success(res, { leads, total });
  } catch (e) { next(e); }
};

const getLeadsSummary = async (req, res, next) => {
  try {
    const summary = await prisma.vendor.findMany({
      where: { deleted: false },
      select: { id: true, name: true, category: { select: { name: true } }, _count: { select: { leads: true } }, leads: { select: { actionType: true } } },
      orderBy: { leads: { _count: 'desc' } },
    });
    const enriched = summary.map(v => {
      const byType = v.leads.reduce((a, l) => { a[l.actionType] = (a[l.actionType] || 0) + 1; return a; }, {});
      return { id: v.id, name: v.name, category: v.category.name, total: v._count.leads, ...byType };
    });
    return success(res, { summary: enriched });
  } catch (e) { next(e); }
};

// CONTACTS
const getContacts = async (req, res, next) => {
  try {
    const { vendorId, page = 1, limit = 20 } = req.query;
    const where = { deleted: false };
    if (vendorId) where.vendorId = vendorId;
    const skip = (Number(page) - 1) * Number(limit);
    const [contacts, total] = await Promise.all([
      prisma.contactRequest.findMany({ where, include: { user: { select: { name: true, email: true } }, vendor: { select: { name: true } }, event: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.contactRequest.count({ where }),
    ]);
    return success(res, { contacts, total });
  } catch (e) { next(e); }
};

// LOGS
const getLogs = async (req, res, next) => {
  try {
    const logs = await prisma.adminLog.findMany({ include: { admin: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return success(res, { logs });
  } catch (e) { next(e); }
};

module.exports = {
  getDashboard, getUsers, toggleUser, changeRole,
  getVendors, createVendor, updateVendor, deleteVendor, toggleVendor,
  getVendorCategories, createVendorCategory, updateVendorCategory, deleteVendorCategory,
  getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  getLeads, getLeadsSummary, getContacts, getLogs,
};
