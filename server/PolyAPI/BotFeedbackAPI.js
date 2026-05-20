/**
 * PolyAPI · BotFeedbackAPI
 *
 * Discord webhook endpoints for bug reports and feature suggestions.
 * No authentication required. IP-based rate limit: 3 submissions per 10 minutes.
 *
 * Mount point: /api/v1/bot-feedback
 */

import { createRouter } from './Router.js';
import { success, fail, guard, ERRORS } from './Protocol.js';
import { schema, v } from './Validator.js';

const BUG_WEBHOOK      = 'https://discord.com/api/webhooks/1506419889697456190/y2pd3zMyW78FM4UqVkTSLGLnnBgOp5TH032K3IX6unZ_HI81qK46WS8VFme6dvHqXf1X';
const SUGGEST_WEBHOOK  = 'https://discord.com/api/webhooks/1506420037358063759/hRu_Y5i7l5NQc_w7dx1NMcQ4Mz2zG58etR-3u_qgh6MIv7FowM8Z4O1IubSVAEr7E6VJ';

// ── IP rate limiter (3 per 10 min) ────────────────────────────────────────────

const rateLimitMap = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.reset < cutoff) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW_MS);

function checkRateLimit(req, res) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW_MS; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_MAX) {
    fail(res, ERRORS.RATE_LIMITED, 'Too many submissions. Please wait a few minutes.');
    return false;
  }
  return true;
}

// ── Discord helper ────────────────────────────────────────────────────────────

async function postToDiscord(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook returned ${res.status}: ${text}`);
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[bot-feedback-api]' });

// ── POST /bot-feedback/bug ────────────────────────────────────────────────────

const bugSchema = schema({
  summary:     v.string({ required: true, min: 1, max: 100,  label: 'summary' }),
  description: v.string({ required: true, min: 1, max: 1000, label: 'description' }),
  steps:       v.optional(v.string({ max: 500,  label: 'steps' })),
  expected:    v.optional(v.string({ max: 300,  label: 'expected' })),
});

router.post('/bug', guard(async (req, res) => {
  if (!checkRateLimit(req, res)) return;

  const err = bugSchema.first(req.body);
  if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

  const { summary, description, steps, expected } = req.body;

  const fields = [];
  if (steps?.trim())    fields.push({ name: 'Steps to reproduce', value: steps.trim().slice(0, 500),    inline: false });
  if (expected?.trim()) fields.push({ name: 'Expected behaviour',  value: expected.trim().slice(0, 300), inline: false });

  try {
    await postToDiscord(BUG_WEBHOOK, {
      username:   'Polymart Bug Reports',
      avatar_url: 'https://polymart.co/polymartlogosquare.png',
      embeds: [{
        title:       summary.trim(),
        description: description.trim(),
        color:       0xe74c3c,
        fields,
        footer:    { text: 'Submitted via polymart.co/bug-report' },
        timestamp: new Date().toISOString(),
      }],
    });
    return success(res, { ok: true });
  } catch (err) {
    console.error('[bot-feedback-api] bug:', err.message);
    return fail(res, ERRORS.UPSTREAM_ERROR, 'Failed to submit. Please try again.');
  }
}));

// ── POST /bot-feedback/suggestion ────────────────────────────────────────────

const suggestionSchema = schema({
  title:       v.string({ required: true, min: 1, max: 100,  label: 'title' }),
  description: v.string({ required: true, min: 1, max: 1000, label: 'description' }),
  usecase:     v.optional(v.string({ max: 300, label: 'usecase' })),
});

router.post('/suggestion', guard(async (req, res) => {
  if (!checkRateLimit(req, res)) return;

  const err = suggestionSchema.first(req.body);
  if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

  const { title, description, usecase } = req.body;

  const fields = [];
  if (usecase?.trim()) fields.push({ name: 'Why would this help?', value: usecase.trim().slice(0, 300), inline: false });

  try {
    await postToDiscord(SUGGEST_WEBHOOK, {
      username:   'Polymart Suggestions',
      avatar_url: 'https://polymart.co/polymartlogosquare.png',
      embeds: [{
        title:       title.trim(),
        description: description.trim(),
        color:       0x3498db,
        fields,
        footer:    { text: 'Submitted via polymart.co/suggestion' },
        timestamp: new Date().toISOString(),
      }],
    });
    return success(res, { ok: true });
  } catch (err) {
    console.error('[bot-feedback-api] suggestion:', err.message);
    return fail(res, ERRORS.UPSTREAM_ERROR, 'Failed to submit. Please try again.');
  }
}));

export default router;
