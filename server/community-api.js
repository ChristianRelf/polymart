import { Router }          from 'express';
import { getAuth }         from '@clerk/express';
import { randomBytes }     from 'crypto';
import { fileURLToPath }   from 'url';
import path                from 'path';
import { mkdirSync }       from 'fs';
import multer              from 'multer';
import sharp               from 'sharp';
import { dbUser as pool } from './db.js';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR  = path.join(__dirname, 'uploads', 'community');
mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    cb(null, allowed.has(file.mimetype));
  },
});

const SHARE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateShareId() {
  const bytes = randomBytes(18);
  return Array.from(bytes, b => SHARE_ALPHABET[b % 62]).join('');
}

const router = Router();

const VALID_TYPES   = new Set(['general', 'trade', 'analysis', 'question']);
const VALID_REASONS = new Set(['Spam', 'Misinformation', 'Inappropriate', 'Off-topic']);

// Rate limit: 5 posts per hour per user (in-memory, resets on server restart)
const postRateMap = new Map();
function postRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now   = Date.now();
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

// Rate limit: 30 comments per hour per user
const commentRateMap = new Map();
function commentRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now   = Date.now();
  const entry = commentRateMap.get(userId);
  if (!entry || now - entry.resetAt > 3_600_000) {
    commentRateMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= 30) {
    return res.status(429).json({ error: 'You can post a maximum of 30 comments per hour.' });
  }
  entry.count++;
  next();
}

// ── POST /community/upload ────────────────────────────────────────────────────
// Auth required. Accepts a single image file ≤ 10 MB. Returns { url }.
router.post('/upload', (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  upload.single('image')(req, res, err => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large — maximum 10 MB'
        : (err.message || 'Upload error');
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image provided (jpeg/png/gif/webp, max 10 MB)' });
  try {
    const filename = randomBytes(16).toString('hex') + '.webp';
    const filepath = path.join(UPLOADS_DIR, filename);
    await sharp(req.file.buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);
    res.json({ url: `/uploads/community/${filename}` });
  } catch (e) {
    console.error('[community-api] image sharp:', e.message);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

// ── GET /community/my-reports ─────────────────────────────────────────────────
// Auth required. Returns posts the current user has reported.
// Must be before /posts to avoid route shadowing.
router.get('/my-reports', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const [rows] = await pool.query(
      `SELECT cr.id, cr.post_id, cr.reason, cr.created_at,
              cp.title, cp.share_id, cp.is_removed
       FROM community_reports cr
       JOIN community_posts cp ON cp.id = cr.post_id
       WHERE cr.reporter_clerk_id = ?
       ORDER BY cr.created_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error('[community-api] GET /my-reports:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /community/posts ──────────────────────────────────────────────────────
// Public. Returns paginated posts with comment counts.
// ?page=1 &type=trade|analysis|question|general &sort=new|top &community=slug
router.get('/posts', async (req, res) => {
  const page      = Math.max(1, parseInt(req.query.page) || 1);
  const type      = req.query.type;
  const community = req.query.community?.trim() || '';
  const sort      = req.query.sort === 'top'
    ? 'cp.is_pinned DESC, cp.likes DESC, cp.created_at DESC'
    : 'cp.is_pinned DESC, cp.created_at DESC';
  const limit  = 20;
  const offset = (page - 1) * limit;

  try {
    const conditions = ['cp.is_removed = 0'];
    const params     = [];

    if (type && VALID_TYPES.has(type)) {
      conditions.push('cp.post_type = ?');
      params.push(type);
    }

    if (community) {
      const [[comm]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [community]);
      if (!comm) return res.json({ posts: [], total: 0, page, pages: 0 });
      conditions.push('cp.community_id = ?');
      params.push(comm.id);
    } else {
      // General feed: posts with no community OR posts from any community.
      // (no extra filter — show everything not removed)
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT cp.id, cp.share_id, cp.clerk_id,
              COALESCE(cp.display_name, up.display_name) AS display_name,
              COALESCE(cp.avatar_url, up.avatar_url) AS avatar_url,
              cp.title, cp.body, cp.post_type, cp.likes, cp.created_at,
              cp.is_pinned, cp.is_removed, cp.community_id,
              c.slug AS community_slug, c.display_name AS community_display_name,
              COUNT(cc.id) AS comment_count,
              COALESCE(up.is_verified, 0) AS author_verified,
              up.profile_id AS author_profile_id,
              (up.email = 'christianjamesrelf@gmail.com') AS author_is_staff
       FROM community_posts cp
       LEFT JOIN community_comments cc ON cc.post_id = cp.id
       LEFT JOIN communities c ON c.id = cp.community_id
       LEFT JOIN user_profiles up ON up.clerk_id = cp.clerk_id
       ${where}
       GROUP BY cp.id
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM community_posts cp ${where}`,
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

  const { title, body, post_type = 'general', community_id = null } = req.body;

  if (!title || typeof title !== 'string' || !title.trim() || title.length > 280)
    return res.status(400).json({ error: 'title is required and must be under 280 characters' });
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 10000)
    return res.status(400).json({ error: 'body is required and must be under 10000 characters' });
  let resolvedCommunityId = null;
  if (community_id) {
    resolvedCommunityId = parseInt(community_id) || null;
    if (resolvedCommunityId) {
      const [[comm]] = await pool.query(
        'SELECT id, post_permission, post_tags FROM communities WHERE id = ?',
        [resolvedCommunityId]
      );
      if (!comm) return res.status(404).json({ error: 'Community not found' });

      // Validate post_type against community tags (or defaults if no custom tags).
      const allowedTypes = comm.post_tags
        ? new Set(comm.post_tags.map(t => t.key))
        : VALID_TYPES;
      if (!allowedTypes.has(post_type))
        return res.status(400).json({ error: 'Invalid post type for this community' });

      // Check ban first.
      const [[ban]] = await pool.query(
        'SELECT id FROM community_bans WHERE community_id = ? AND clerk_id = ?',
        [resolvedCommunityId, userId]
      );
      if (ban) return res.status(403).json({ error: 'You are banned from posting in this community' });

      // Enforce post_permission.
      if (comm.post_permission === 'members') {
        const [[membership]] = await pool.query(
          'SELECT role FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
          [resolvedCommunityId, userId]
        );
        if (!membership)
          return res.status(403).json({ error: 'You must join this community before posting' });
      } else if (comm.post_permission === 'chosen') {
        const [[membership]] = await pool.query(
          'SELECT role FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
          [resolvedCommunityId, userId]
        );
        const isMod = membership?.role === 'moderator' || membership?.role === 'owner';
        if (!isMod) {
          const [[allowed]] = await pool.query(
            'SELECT id FROM community_post_allowlist WHERE community_id = ? AND clerk_id = ?',
            [resolvedCommunityId, userId]
          );
          if (!allowed)
            return res.status(403).json({ error: 'Posting in this community is restricted to selected members' });
        }
      }
      // post_permission === 'everyone': no further check
    }
  } else {
    // General feed post: validate against default types.
    if (!VALID_TYPES.has(post_type))
      return res.status(400).json({ error: 'Invalid post_type' });
  }

  const [[profile]] = await pool.query(
    'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?',
    [userId]
  );

  const shareId = generateShareId();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO community_posts (community_id, share_id, clerk_id, display_name, avatar_url, title, body, post_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [resolvedCommunityId, shareId, userId, profile?.display_name ?? null, profile?.avatar_url ?? null,
       title.trim(), body.trim(), post_type]
    );

    if (resolvedCommunityId) {
      await conn.query('UPDATE communities SET post_count = post_count + 1 WHERE id = ?', [resolvedCommunityId]);
    }

    await conn.commit();

    res.status(201).json({
      id:            result.insertId,
      share_id:      shareId,
      clerk_id:      userId,
      display_name:  profile?.display_name ?? null,
      avatar_url:    profile?.avatar_url   ?? null,
      title:         title.trim(),
      body:          body.trim(),
      post_type,
      community_id:  resolvedCommunityId,
      is_pinned:     0,
      is_removed:    0,
      likes:         0,
      comment_count: 0,
      created_at:    new Date().toISOString(),
    });
  } catch (err) {
    await conn.rollback();
    console.error('[community-api] POST /posts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── GET /community/posts/share/:shareId ──────────────────────────────────────
// Public. Must be defined before /:id routes.
router.get('/posts/share/:shareId', async (req, res) => {
  const { shareId } = req.params;
  try {
    const [[post]] = await pool.query(
      `SELECT cp.id, cp.share_id, cp.clerk_id,
              COALESCE(cp.display_name, up.display_name) AS display_name,
              COALESCE(cp.avatar_url, up.avatar_url) AS avatar_url,
              cp.title, cp.body, cp.post_type, cp.likes, cp.created_at,
              COUNT(cc.id) AS comment_count,
              COALESCE(up.is_verified, 0) AS author_verified,
              up.profile_id AS author_profile_id,
              (up.email = 'christianjamesrelf@gmail.com') AS author_is_staff
       FROM community_posts cp
       LEFT JOIN community_comments cc ON cc.post_id = cp.id
       LEFT JOIN user_profiles up ON up.clerk_id = cp.clerk_id
       WHERE cp.share_id = ?
       GROUP BY cp.id`,
      [shareId]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('[community-api] GET /posts/share/:shareId:', err.message);
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
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 10000)
    return res.status(400).json({ error: 'body is required and must be under 10000 characters' });

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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(
      'INSERT IGNORE INTO community_likes (post_id, clerk_id) VALUES (?, ?)',
      [postId, userId]
    );
    if (ins.affectedRows === 0) {
      await conn.rollback();
      return res.json({ success: true, already_liked: true });
    }
    const [upd] = await conn.query(
      'UPDATE community_posts SET likes = likes + 1 WHERE id = ?', [postId]
    );
    if (upd.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Post not found' });
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[community-api] POST /posts/:id/like:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
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
// Public. Returns flat list with parent_id; client builds the tree.
router.get('/posts/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  try {
    const [rows] = await pool.query(
      `SELECT cc.id, cc.post_id, cc.parent_id, cc.clerk_id,
              COALESCE(cc.display_name, up.display_name) AS display_name,
              COALESCE(cc.avatar_url, up.avatar_url) AS avatar_url,
              cc.body, cc.created_at,
              up.profile_id AS author_profile_id,
              (up.email = 'christianjamesrelf@gmail.com') AS author_is_staff
       FROM community_comments cc
       LEFT JOIN user_profiles up ON up.clerk_id = cc.clerk_id
       WHERE cc.post_id = ?
       ORDER BY cc.created_at ASC
       LIMIT 1000`,
      [postId]
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error('[community-api] GET /posts/:id/comments:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /community/posts/:id/comments ───────────────────────────────────────
router.post('/posts/:id/comments', commentRateLimit, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const postId = parseInt(req.params.id);
  if (!postId) return res.status(400).json({ error: 'Invalid post id' });

  const { body, parent_id } = req.body;
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 2000)
    return res.status(400).json({ error: 'Comment must be between 1 and 2000 characters' });

  let parentId = null;
  if (parent_id != null) {
    parentId = parseInt(parent_id);
    if (!parentId) return res.status(400).json({ error: 'Invalid parent_id' });
    // Verify the parent comment belongs to this post
    const [[parent]] = await pool.query(
      'SELECT id FROM community_comments WHERE id = ? AND post_id = ?', [parentId, postId]
    );
    if (!parent) return res.status(400).json({ error: 'Parent comment not found in this post' });
  }

  try {
    const [[post]] = await pool.query(
      'SELECT id FROM community_posts WHERE id = ?', [postId]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?', [userId]
    );

    const [result] = await pool.query(
      `INSERT INTO community_comments (post_id, parent_id, clerk_id, display_name, avatar_url, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [postId, parentId, userId, profile?.display_name ?? null, profile?.avatar_url ?? null, body.trim()]
    );

    res.status(201).json({
      id:           result.insertId,
      post_id:      postId,
      parent_id:    parentId,
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
