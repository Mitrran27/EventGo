// src/modules/chat/chat.routes.js
const router = require('express').Router();
const { chat, adminChat } = require('./chat.controller');
const { optionalAuth, protect, adminOnly } = require('../../middleware/auth');

// User chat — optional auth (works for guests too)
router.post('/', optionalAuth, chat);

// Admin chat — must be authenticated admin
router.post('/admin', protect, adminOnly, adminChat);

module.exports = router;
