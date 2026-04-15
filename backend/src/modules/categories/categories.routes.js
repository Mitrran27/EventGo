const router = require('express').Router();
const c = require('./categories.controller');
router.get('/vendors', c.getVendorCategories);
router.get('/expenses', c.getExpenseCategories);
module.exports = router;
