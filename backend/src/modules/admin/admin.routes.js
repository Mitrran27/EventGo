const router = require('express').Router();
const c = require('./admin.controller');
const { protect, adminOnly } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

router.use(protect, adminOnly);

router.get('/dashboard', c.getDashboard);

router.get('/users', c.getUsers);
router.put('/users/:id/toggle', c.toggleUser);
router.put('/users/:id/role', c.changeRole);

router.get('/vendors', c.getVendors);
router.post('/vendors', [body('name').trim().notEmpty(), body('categoryId').notEmpty(), body('minPrice').isFloat({ min: 0 }), body('maxPrice').isFloat({ min: 0 })], validate, c.createVendor);
router.put('/vendors/:id', c.updateVendor);
router.delete('/vendors/:id', c.deleteVendor);
router.put('/vendors/:id/toggle', c.toggleVendor);

router.get('/vendor-categories', c.getVendorCategories);
router.post('/vendor-categories', [body('name').trim().notEmpty()], validate, c.createVendorCategory);
router.put('/vendor-categories/:id', c.updateVendorCategory);
router.delete('/vendor-categories/:id', c.deleteVendorCategory);

router.get('/expense-categories', c.getExpenseCategories);
router.post('/expense-categories', [body('name').trim().notEmpty()], validate, c.createExpenseCategory);
router.put('/expense-categories/:id', c.updateExpenseCategory);
router.delete('/expense-categories/:id', c.deleteExpenseCategory);

router.get('/leads', c.getLeads);
router.get('/leads/summary', c.getLeadsSummary);
router.get('/contacts', c.getContacts);
router.get('/logs', c.getLogs);

module.exports = router;
