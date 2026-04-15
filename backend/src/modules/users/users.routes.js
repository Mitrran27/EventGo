const router = require('express').Router();
const c = require('./users.controller');
const { protect } = require('../../middleware/auth');
router.use(protect);
router.get('/profile', c.getProfile);
router.put('/profile', c.updateProfile);
module.exports = router;
