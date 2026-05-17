import { Router } from 'express';
import { getAuth } from '@clerk/express';
import pool from './db.js';

const router = Router();

const VALID_TYPES = new Set(['general', 'trade', 'analysis', 'question']);

// Rate limit: 5 posts per hour per user
const postRateMap = new Map();
function postRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now = Date.now();
  const entry = postRateMap.get(userId);
  if (!entry || now - entry.resetAt > 3_600_000) {
    postRateMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= 5) {
    return res.status(429).json({ error: 'You can post a maximum of 5 times per hour.' });
  }
  entry.count++;
  next();
}

// ── GET /community/posts ──────────────────────────────────────────────────────
// Public - no auth required. Returns latest posts, newest first.
router.get('/posts', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const type = req.query.type;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const params = [];
    if (type && VALID_TYPES.has(type)) {
      conditions.push('post_type = ?');
      params.push(type);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT id, clerk_id, display_name, avatar_url, title, body, post_type, likes, created_at
       FROM community_posts ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM community_posts ${where}`,
      params
    );

    res.json({ posts: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[community-api] GET /posts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /community/posts ─────────────────────────────────────────────────────
router.post('/posts', postRateLimit, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { title, body, post_type = 'general' } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 280) {
    return res.status(400).json({ error: 'title is required and must be under 280 characters' });
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0 || body.length > 2000) {
    return res.status(400).json({ error: 'body is required and must be under 2000 characters' });
  }
  if (!VALID_TYPES.has(post_type)) {
    return res.status(400).json({ error: 'Invalid post_type' });
  }

  try {
    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );

    const [result] = await pool.query(
      `INSERT INTO community_posts (clerk_id, display_name, avatar_url, title, body, post_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, profile?.display_name ?? null, profile?.avatar_url ?? null, title.trim(), body.trim(), post_type]
    );

    res.status(201).json({
      id: result.insertId,
      clerk_id: userId,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      title: title.trim(),
      body: body.trim(),
      post_type,
      likes: 0,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[community-api] POST /posts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /community/posts/:id/like ────────────────────────────────────────────
router.post('/posts/:id/like', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  try {
    const [result] = await pool.query(
      'UPDATE community_posts SET likes = likes + 1 WHERE id = ?',
      [postId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[community-api] POST /posts/:id/like:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /community/posts/:id ───────────────────────────────────────────────
router.delete('/posts/:id', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  try {
    const [result] = await pool.query(
      'DELETE FROM community_posts WHERE id = ? AND clerk_id = ?',
      [postId, userId]
    );
    if (result.affectedRows === 0) return res.status(403).json({ error: 'Not found or not yours' });
    res.json({ success: true });
  } catch (err) {
    console.error('[community-api] DELETE /posts/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
