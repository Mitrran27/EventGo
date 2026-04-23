// src/modules/chat/chat.controller.js
const { error } = require('../../utils/response');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const chat = async (req, res, next) => {
  try {
    const { messages, userContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return error(res, 'Messages array is required', 400);
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return error(res, 'Each message must have role and content', 400);
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        return error(res, 'Message role must be "user" or "assistant"', 400);
      }
    }

    // Timeout set to 120s — Ollama can be slow on first load
    const aiRes = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        user_context: userContext || null,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.json().catch(() => ({}));
      console.error('AI service error:', errBody);
      return error(res, errBody.detail || 'AI service unavailable', 502);
    }

    const data = await aiRes.json();

    return res.json({
      success: true,
      data: {
        reply: data.reply,
        vendorsMentioned: data.vendors_mentioned || [],
      },
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return error(res, 'AI service timed out, please try again', 504);
    }
    next(e);
  }
};

module.exports = { chat };
