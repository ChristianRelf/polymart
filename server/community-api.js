import { Router } from 'express';
import { getAuth } from '@clerk/express';
import pool from './db.js';

const router = Router();

const VALID_TYPES   = new Set(['general', 'trade', 'analysis', 'question']);
const VALID_REASONS = new Set(['Spam', 'Misinformation', 'Inappropriate', 'Off-topic']);

// Rate limit: 5 posts per hour per user (in-memory, resets on server restart)
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
// Public. Returns paginated posts with comment counts.
// ?page=1 &type=trade|analysis|question|general &sort=new|top
router.get('/posts', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const type  = req.query.type;
  const sort  = req.query.sort === 'top'
    ? 'cp.likes DESC, cp.created_at DESC'
    : 'cp.created_at DESC';
  const limit  = 20;
  const offset = (page - 1) * limit;

  try {
    const hasType = type && VALID_TYPES.has(type);
    const where   = hasType ? 'WHERE cp.post_type = ?' : '';
    const params  = hasType ? [type] : [];

    const [rows] = await pool.query(
      `SELECT cp.id, cp.clerk_id, cp.display_name, cp.avatar_url,
              cp.title, cp.body, cp.post_type, cp.likes, cp.created_at,
              COUNT(cc.id) AS comment_count
       FROM community_posts cp
       LEFT JOIN community_comments cc ON cc.post_id = cp.id
       ${where}
       GROUP BY cp.id
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM community_posts${hasType ? ' WHERE post_type = ?' : ''}`,
      hasType ? [type] : []
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

  if (!title || typeof title !== 'string' || !title.trim() || title.length > 280)
    return res.status(400).json({ error: 'title is required and must be under 280 characters' });
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 2000)
    return res.status(400).json({ error: 'body is required and must be under 2000 characters' });
  if (!VALID_TYPES.has(post_type))
    return res.status(400).json({ error: 'Invalid post_type' });

  try {
    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );

    const [result] = await pool.query(
      `INSERT INTO community_posts (clerk_id, display_name, avatar_url, title, body, post_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, profile?.display_name ?? null, profile?.avatar_url ?? null,
       title.trim(), body.trim(), post_type]
    );

    res.status(201).json({
      id: result.insertId,
      clerk_id: userId,
      display_name: profile?.display_name ?? null,
      avatar_url:   profile?.avatar_url   ?? null,
      title: title.trim(),
      body:  body.trim(),
      post_type,
      likes: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[community-api] POST /posts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /community/posts/:id ──────────────────────────────────────────────────
router.put('/posts/:id', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  const { title, body, post_type } = req.body;

  if (!title || typeof title !== 'string' || !title.trim() || title.length > 280)
    return res.status(400).json({ error: 'title is required and must be under 280 characters' });
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 2000)
    return res.status(400).json({ error: 'body is required and must be under 2000 characters' });

  const type = post_type && VALID_TYPES.has(post_type) ? post_type : null;

  try {
    const setParts = ['title = ?', 'body = ?'];
    const vals     = [title.trim(), body.trim()];
    if (type) { setParts.push('post_type = ?'); vals.push(type); }
    vals.push(postId, userId);

    const [result] = await pool.query(
      `UPDATE community_posts SET ${setParts.join(', ')} WHERE id = ? AND clerk_id = ?`,
      vals
    );
    if (result.affectedRows === 0)
      return res.status(403).json({ error: 'Not found or not yours' });

    res.json({ success: true, title: title.trim(), body: body.trim(), post_type: type });
  } catch (err) {
    console.error('[community-api] PUT /posts/:id:', err.message);
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
      'UPDATE community_posts SET likes = likes + 1 WHERE id = ?', [postId]
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
      'DELETE FROM community_posts WHERE id = ? AND clerk_id = ?', [postId, userId]
    );
    if (result.affectedRows === 0)
      return res.status(403).json({ error: 'Not found or not yours' });
    res.json({ success: true });
  } catch (err) {
    console.error('[community-api] DELETE /posts/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /community/posts/:id/comments ────────────────────────────────────────
// Public.
router.get('/posts/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  try {
    const [rows] = await pool.query(
      `SELECT id, post_id, clerk_id, display_name, avatar_url, body, created_at
       FROM community_comments
       WHERE post_id = ?
       ORDER BY created_at ASC`,
      [postId]
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error('[community-api] GET /posts/:id/comments:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /community/posts/:id/comments ───────────────────────────────────────
router.post('/posts/:id/comments', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  const { body } = req.body;
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 1000)
    return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters' });

  try {
    const [[post]] = await pool.query(
      'SELECT id FROM community_posts WHERE id = ?', [postId]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?', [userId]
    );

    const [result] = await pool.query(
      `INSERT INTO community_comments (post_id, clerk_id, display_name, avatar_url, body)
       VALUES (?, ?, ?, ?, ?)`,
      [postId, userId, profile?.display_name ?? null, profile?.avatar_url ?? null, body.trim()]
    );

    res.status(201).json({
      id:           result.insertId,
      post_id:      postId,
      clerk_id:     userId,
      display_name: profile?.display_name ?? null,
      avatar_url:   profile?.avatar_url   ?? null,
      body:         body.trim(),
      created_at:   new Date().toISOString(),
    });
  } catch (err) {
    console.error('[community-api] POST /posts/:id/comments:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /community/comments/:id ───────────────────────────────────────────
router.delete('/comments/:id', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const commentId = parseInt(req.params.id);
  if (!commentId) return res.status(400).json({ error: 'Invalid comment id' });

  try {
    const [result] = await pool.query(
      'DELETE FROM community_comments WHERE id = ? AND clerk_id = ?', [commentId, userId]
    );
    if (result.affectedRows === 0)
      return res.status(403).json({ error: 'Not found or not yours' });
    res.json({ success: true });
  } catch (err) {
    console.error('[community-api] DELETE /comments/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /community/posts/:id/report ─────────────────────────────────────────
router.post('/posts/:id/report', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  const { reason } = req.body;
  if (!reason || !VALID_REASONS.has(reason))
    return res.status(400).json({ error: 'Invalid reason' });

  try {
    await pool.query(
      `INSERT IGNORE INTO community_reports (post_id, reporter_clerk_id, reason)
       VALUES (?, ?, ?)`,
      [postId, userId, reason]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[community-api] POST /posts/:id/report:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
