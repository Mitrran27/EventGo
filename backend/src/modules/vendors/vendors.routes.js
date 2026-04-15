const router = require('express').Router();
const c = require('./vendors.controller');
const { optionalAuth } = require('../../middleware/auth');
router.get('/', optionalAuth, c.getVendors);
router.get('/:id', optionalAuth, c.getVendor);
module.exports = router;
