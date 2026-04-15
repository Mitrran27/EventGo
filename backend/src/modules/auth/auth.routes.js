// src/modules/auth/auth.routes.js
const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, getMe, changePassword } = require('./auth.controller');
const { protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validate, register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, login);

router.get('/me', protect, getMe);
router.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, changePassword);

module.exports = router;
