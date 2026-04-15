const prisma = require('../../config/db');
const { success, error } = require('../../utils/response');

const getExpenses = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId, userId: req.user.id, deleted: false } });
    if (!event) return error(res, 'Event not found', 404);
    const expenses = await prisma.expense.findMany({ where: { eventId: req.params.eventId, deleted: false }, include: { category: true }, orderBy: { createdAt: 'desc' } });
    return success(res, { expenses });
  } catch (e) { next(e); }
};

const createExpense = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId, userId: req.user.id, deleted: false } });
    if (!event) return error(res, 'Event not found', 404);
    const { categoryId, title, estimatedAmount, actualAmount } = req.body;
    const existing = await prisma.expense.findMany({ where: { eventId: req.params.eventId, deleted: false } });
    const currentTotal = existing.reduce((s, x) => s + Number(x.estimatedAmount), 0);
    if (currentTotal + Number(estimatedAmount) > Number(event.totalBudget)) {
      return error(res, 'Adding this expense exceeds your total budget of RM' + event.totalBudget, 400);
    }
    const expense = await prisma.expense.create({ data: { eventId: req.params.eventId, categoryId, title, estimatedAmount, actualAmount: actualAmount || null }, include: { category: true } });
    return success(res, { expense }, 'Expense added', 201);
  } catch (e) { next(e); }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({ where: { id: req.params.expenseId, eventId: req.params.eventId, deleted: false } });
    if (!expense) return error(res, 'Expense not found', 404);
    const { title, estimatedAmount, actualAmount, categoryId } = req.body;
    const updated = await prisma.expense.update({ where: { id: req.params.expenseId }, data: { ...(title && { title }), ...(estimatedAmount !== undefined && { estimatedAmount }), ...(actualAmount !== undefined && { actualAmount }), ...(categoryId && { categoryId }) }, include: { category: true } });
    return success(res, { expense: updated }, 'Expense updated');
  } catch (e) { next(e); }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({ where: { id: req.params.expenseId, eventId: req.params.eventId, deleted: false } });
    if (!expense) return error(res, 'Expense not found', 404);
    await prisma.expense.update({ where: { id: req.params.expenseId }, data: { deleted: true } });
    return success(res, {}, 'Expense deleted');
  } catch (e) { next(e); }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
