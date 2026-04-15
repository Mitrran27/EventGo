const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const sendContact = async (req, res, next) => {
  try {
    const { vendorId, eventId, message, contactEmail } = req.body;
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deleted: false } });
    if (!vendor) return error(res, 'Vendor not found', 404);
    const lead = await prisma.vendorLead.create({
      data: { vendorId, userId: req.user.id, eventId: eventId || null, actionType: 'CONTACT' },
    });
    const contact = await prisma.contactRequest.create({
      data: { userId: req.user.id, vendorId, eventId: eventId || null, leadId: lead.id, message, contactEmail },
      include: { vendor: { select: { name: true } } },
    });
    return success(res, { contact }, 'Inquiry sent', 201);
  } catch (e) { next(e); }
};

const getMyContacts = async (req, res, next) => {
  try {
    const contacts = await prisma.contactRequest.findMany({
      where: { userId: req.user.id, deleted: false },
      include: {
        vendor: { select: { id: true, name: true, imageUrl: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, { contacts });
  } catch (e) { next(e); }
};

module.exports = { sendContact, getMyContacts };
