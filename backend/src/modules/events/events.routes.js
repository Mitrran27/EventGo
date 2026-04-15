// src/modules/events/events.routes.js
const router = require('express').Router();
const { body } = require('express-validator');
const c = require('./events.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.use(protect);

router.get('/', c.getEvents);
router.post('/', [
  body('name').trim().notEmpty(),
  body('eventType').trim().notEmpty(),
  body('eventDate').isISO8601(),
  body('totalBudget').isFloat({ min: 0 }),
], validate, c.createEvent);
router.get('/:id', c.getEvent);
router.put('/:id', c.updateEvent);
router.delete('/:id', c.deleteEvent);

module.exports = router;
