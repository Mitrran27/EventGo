const router = require('express').Router({ mergeParams: true });
const c = require('./event-vendors.controller');
const { protect } = require('../../middleware/auth');
router.use(protect);
router.get('/', c.getEventVendors);
router.post('/', c.addVendorToEvent);
router.put('/:evId', c.updateEventVendor);
router.delete('/:evId', c.removeVendorFromEvent);
module.exports = router;
