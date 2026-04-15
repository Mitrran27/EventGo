const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const getEventVendors = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId, userId: req.user.id, deleted: false } });
    if (!event) return error(res, 'Event not found', 404);
    const eventVendors = await prisma.eventVendor.findMany({
      where: { eventId: req.params.eventId, deleted: false },
      include: { vendor: { include: { category: true } } },
    });
    return success(res, { eventVendors });
  } catch (e) { next(e); }
};

const addVendorToEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId, userId: req.user.id, deleted: false } });
    if (!event) return error(res, 'Event not found', 404);
    const { vendorId, status, notes } = req.body;
    const ev = await prisma.eventVendor.upsert({
      where: { eventId_vendorId: { eventId: req.params.eventId, vendorId } },
      update: { deleted: false, status: status || 'SHORTLISTED', notes },
      create: { eventId: req.params.eventId, vendorId, status: status || 'SHORTLISTED', notes },
      include: { vendor: { include: { category: true } } },
    });
    return success(res, { eventVendor: ev }, 'Vendor added to event', 201);
  } catch (e) { next(e); }
};

const updateEventVendor = async (req, res, next) => {
  try {
    const ev = await prisma.eventVendor.findFirst({ where: { id: req.params.evId, eventId: req.params.eventId, deleted: false } });
    if (!ev) return error(res, 'Not found', 404);
    const updated = await prisma.eventVendor.update({
      where: { id: req.params.evId },
      data: {
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
      },
      include: { vendor: true },
    });
    return success(res, { eventVendor: updated });
  } catch (e) { next(e); }
};

const removeVendorFromEvent = async (req, res, next) => {
  try {
    const ev = await prisma.eventVendor.findFirst({ where: { id: req.params.evId, eventId: req.params.eventId, deleted: false } });
    if (!ev) return error(res, 'Not found', 404);
    await prisma.eventVendor.update({ where: { id: req.params.evId }, data: { deleted: true } });
    return success(res, {}, 'Vendor removed from event');
  } catch (e) { next(e); }
};

module.exports = { getEventVendors, addVendorToEvent, updateEventVendor, removeVendorFromEvent };
