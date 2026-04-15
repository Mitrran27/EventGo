const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const getEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.user.id, deleted: false },
      include: {
        expenses: { where: { deleted: false }, select: { estimatedAmount: true, actualAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = events.map((e) => {
      const totalSpent = e.expenses.reduce((s, x) => s + Number(x.actualAmount || x.estimatedAmount), 0);
      return { ...e, totalSpent, remaining: Number(e.totalBudget) - totalSpent };
    });
    return success(res, { events: enriched });
  } catch (e) { next(e); }
};

const createEvent = async (req, res, next) => {
  try {
    const { name, eventType, eventDate, totalBudget, status } = req.body;
    const event = await prisma.event.create({
      data: { userId: req.user.id, name, eventType, eventDate: new Date(eventDate), totalBudget, status: status || 'DRAFT' },
    });
    return success(res, { event }, 'Event created', 201);
  } catch (e) { next(e); }
};

const getEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.user.id, deleted: false },
      include: {
        expenses: {
          where: { deleted: false },
          include: { category: true },
          orderBy: { createdAt: 'desc' },
        },
        eventVendors: {
          where: { deleted: false },
          include: { vendor: { include: { category: true } } },
        },
      },
    });
    if (!event) return error(res, 'Event not found', 404);
    const totalSpent = event.expenses.reduce((s, x) => s + Number(x.actualAmount || x.estimatedAmount), 0);
    return success(res, { event: { ...event, totalSpent, remaining: Number(event.totalBudget) - totalSpent } });
  } catch (e) { next(e); }
};

const updateEvent = async (req, res, next) => {
  try {
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id, deleted: false } });
    if (!existing) return error(res, 'Event not found', 404);
    const { name, eventType, eventDate, totalBudget, status } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(eventType && { eventType }), ...(eventDate && { eventDate: new Date(eventDate) }), ...(totalBudget !== undefined && { totalBudget }), ...(status && { status }) },
    });
    return success(res, { event }, 'Event updated');
  } catch (e) { next(e); }
};

const deleteEvent = async (req, res, next) => {
  try {
    const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id, deleted: false } });
    if (!existing) return error(res, 'Event not found', 404);
    await prisma.event.update({ where: { id: req.params.id }, data: { deleted: true } });
    return success(res, {}, 'Event deleted');
  } catch (e) { next(e); }
};

module.exports = { getEvents, createEvent, getEvent, updateEvent, deleteEvent };
