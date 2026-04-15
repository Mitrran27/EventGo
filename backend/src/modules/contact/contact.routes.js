const router = require('express').Router();
const { body } = require('express-validator');
const c = require('./contact.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many contact requests. Please try again later.',
});

router.use(protect);
router.post('/', contactLimiter, [
  body('vendorId').notEmpty(),
  body('message').trim().isLength({ min: 10, max: 1000 }),
  body('contactEmail').isEmail().normalizeEmail(),
], validate, c.sendContact);
router.get('/', c.getMyContacts);
module.exports = router;
