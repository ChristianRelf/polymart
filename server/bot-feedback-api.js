import { Router } from 'express';

const router = Router();

const BUG_WEBHOOK    = 'https://discord.com/api/webhooks/1506419889697456190/y2pd3zMyW78FM4UqVkTSLGLnnBgOp5TH032K3IX6unZ_HI81qK46WS8VFme6dvHqXf1X';
const SUGGEST_WEBHOOK = 'https://discord.com/api/webhooks/1506420037358063759/hRu_Y5i7l5NQc_w7dx1NMcQ4Mz2zG58etR-3u_qgh6MIv7FowM8Z4O1IubSVAEr7E6VJ';

// Very simple in-memory rate limit: 3 submissions per IP per 10 minutes
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 10 * 60 * 1000;
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + window };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + window; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > 3;
}

async function postToDiscord(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook returned ${res.status}: ${text}`);
  }
}

// ── POST /bot-feedback/bug ────────────────────────────────────────────────────
router.post('/bug', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many submissions. Please wait a few minutes.' });

  const { summary, description, steps, expected } = req.body;
  if (!summary?.trim() || !description?.trim())
    return res.status(400).json({ error: 'Summary and description are required.' });
  if (summary.length > 100)   return res.status(400).json({ error: 'Summary must be 100 characters or fewer.' });
  if (description.length > 1000) return res.status(400).json({ error: 'Description must be 1000 characters or fewer.' });

  const fields = [];
  if (steps?.trim())    fields.push({ name: 'Steps to reproduce', value: steps.trim().slice(0, 500),    inline: false });
  if (expected?.trim()) fields.push({ name: 'Expected behaviour',  value: expected.trim().slice(0, 300), inline: false });

  try {
    await postToDiscord(BUG_WEBHOOK, {
      username: 'Polymart Bug Reports',
      avatar_url: 'https://polymart.co/polymartlogosquare.png',
      embeds: [{
        title: summary.trim(),
        description: description.trim(),
        color: 0xe74c3c,
        fields,
        footer: { text: 'Submitted via polymart.co/bug-report' },
        timestamp: new Date().toISOString(),
      }],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[bot-feedback] bug:', err.message);
    res.status(502).json({ error: 'Failed to submit. Please try again.' });
  }
});

// ── POST /bot-feedback/suggestion ────────────────────────────────────────────
router.post('/suggestion', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many submissions. Please wait a few minutes.' });

  const { title, description, usecase } = req.body;
  if (!title?.trim() || !description?.trim())
    return res.status(400).json({ error: 'Title and description are required.' });
  if (title.length > 100)       return res.status(400).json({ error: 'Title must be 100 characters or fewer.' });
  if (description.length > 1000) return res.status(400).json({ error: 'Description must be 1000 characters or fewer.' });

  const fields = [];
  if (usecase?.trim()) fields.push({ name: 'Why would this help?', value: usecase.trim().slice(0, 300), inline: false });

  try {
    await postToDiscord(SUGGEST_WEBHOOK, {
      username: 'Polymart Suggestions',
      avatar_url: 'https://polymart.co/polymartlogosquare.png',
      embeds: [{
        title: title.trim(),
        description: description.trim(),
        color: 0x3498db,
        fields,
        footer: { text: 'Submitted via polymart.co/suggestion' },
        timestamp: new Date().toISOString(),
      }],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[bot-feedback] suggestion:', err.message);
    res.status(502).json({ error: 'Failed to submit. Please try again.' });
  }
});

export default router;
