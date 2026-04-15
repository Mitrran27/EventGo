// src/modules/expenses/expenses.routes.js
const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const c = require('./expenses.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.use(protect);
router.get('/', c.getExpenses);
router.post('/', [
  body('categoryId').notEmpty(),
  body('title').trim().notEmpty(),
  body('estimatedAmount').isFloat({ min: 0 }),
], validate, c.createExpense);
router.put('/:expenseId', c.updateExpense);
router.delete('/:expenseId', c.deleteExpense);

module.exports = router;
