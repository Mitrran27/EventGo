// src/modules/chat/chat.routes.js
const router = require('express').Router();
const { chat } = require('./chat.controller');
const { optionalAuth } = require('../../middleware/auth');

// optionalAuth so logged-in users get personalized context,
// but the chat is also accessible to non-logged-in visitors
router.post('/', optionalAuth, chat);

module.exports = router;
