/**
 * PolyAPI · CommunityAPI
 *
 * Posts, comments, likes, reports, and image uploads.
 * Rate-limited: 5 posts/hour, 30 comments/hour per user.
 *
 * Mount point: /api/v1/community
 */

import { getAuth }       from '@clerk/express';
import { randomBytes }   from 'crypto';
import { fileURLToPath } from 'url';
import path              from 'path';
import { mkdirSync }     from 'fs';
import multer            from 'multer';
import sharp             from 'sharp';
import { dbUser as pool } from '../db.js';
import { createRouter }   from './Router.js';
import { requireAuth, rateLimit } from './Middleware.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';

// ── Upload setup ──────────────────────────────────────────────────────────────

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'community');
mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, new Set(['image/jpeg','image/png','image/gif','image/webp']).has(file.mimetype));
  },
});

// ── Content moderation ────────────────────────────────────────────────────────

const HATE_PATTERNS = [
  /\bn[i!1|]+gg[e3]r/i, /\bn[i!1]+gg[a@]/i, /\bf[a@]gg[o0]t/i,
  /\bk[i!1]k[e3]/i, /\bsp[i!1]c/i, /\bc[h]ink/i, /\bg[o0]ok/i,
  /\bwetback/i, /\btr[a@]nny/i, /\bretard/i, /\bc[o0][o0]n\b/i,
  /\bj[e3]w[s]?\s*(lover|pig|rat|scum|bastard)/i,
  /\bwhite\s*(power|pride|supremac)/i, /\bheil\s*hitler/i, /\bn[a@]zi/i,
  /\bdie\s+(you\s+)?(n[i!1]gg|f[a@]g|sp[i!1]c|k[i!1]k)/i,
  /\bkill\s+(all\s+)?(blacks|jews|muslims|gays|trans)/i,
];

function moderateContent(...fields) {
  return fields.some(f => typeof f === 'string' && HATE_PATTERNS.some(p => p.test(f)));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TYPES   = new Set(['general', 'trade', 'analysis', 'question']);
const VALID_REASONS = new Set(['Spam', 'Misinformation', 'Inappropriate', 'Off-topic']);
const STAFF_EMAIL   = 'christianjamesrelf@gmail.com';

function generateShareId() {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(18), b => alpha[b % 62]).join('');
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[community-api]' });

// ── POST /community/upload ────────────────────────────────────────────────────

router.post('/upload', requireAuth(), async (req, res) => {
  upload.single('image')(req, res, async err => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large — maximum 10 MB' : (err.message || 'Upload error');
      return fail(res, ERRORS.VALIDATION_ERROR, msg, HTTP.BAD_REQUEST);
    }
    if (!req.file) return fail(res, ERRORS.MISSING_FIELD, 'No valid image provided (jpeg/png/gif/webp, max 10 MB)', HTTP.BAD_REQUEST);
    try {
      const filename = randomBytes(16).toString('hex') + '.webp';
      const filepath = path.join(UPLOADS_DIR, filename);
      await sharp(req.file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filepath);
      return success(res, { url: `/uploads/community/${filename}` });
    } catch (e) {
      console.error('[community-api] image sharp:', e.message);
      return fail(res, ERRORS.INTERNAL, 'Image processing failed');
    }
  });
});

// ── GET /community/my-reports ─────────────────────────────────────────────────

router.get('/my-reports', requireAuth(), guard(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT cr.id, cr.post_id, cr.reason, cr.created_at,
            cp.title, cp.share_id, cp.is_removed
     FROM community_reports cr
     JOIN community_posts cp ON cp.id = cr.post_id
     WHERE cr.reporter_clerk_id = ?
     ORDER BY cr.created_at DESC LIMIT 100`,
    [req.userId]
  );
  return success(res, { reports: rows });
}));

// ── GET /community/posts ──────────────────────────────────────────────────────

router.get('/posts', guard(async (req, res) => {
  const page      = Math.max(1, parseInt(req.query.page) || 1);
  const type      = req.query.type;
  const community = req.query.community?.trim() || '';
  const sort      = req.query.sort === 'top'
    ? 'cp.is_pinned DESC, cp.likes DESC, cp.created_at DESC'
    : 'cp.is_pinned DESC, cp.created_at DESC';
  const limit  = 20;
  const offset = (page - 1) * limit;

  const conditions = ['cp.is_removed = 0'];
  const params     = [];

  if (type && VALID_TYPES.has(type)) { conditions.push('cp.post_type = ?'); params.push(type); }

  if (community) {
    const [[comm]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [community]);
    if (!comm) return success(res, { posts: [], total: 0, page, pages: 0 });
    conditions.push('cp.community_id = ?'); params.push(comm.id);
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
            (up.email = ?) AS author_is_staff
     FROM community_posts cp
     LEFT JOIN community_comments cc ON cc.post_id = cp.id
     LEFT JOIN communities c ON c.id = cp.community_id
     LEFT JOIN user_profiles up ON up.clerk_id = cp.clerk_id
     ${where}
     GROUP BY cp.id ORDER BY ${sort}
     LIMIT ? OFFSET ?`,
    [STAFF_EMAIL, ...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM community_posts cp ${where}`, params
  );
  return success(res, { posts: rows, total, page, pages: Math.ceil(total / limit) });
}));

// ── POST /community/posts ─────────────────────────────────────────────────────

router.post('/posts',
  requireAuth(),
  rateLimit({ windowMs: 3_600_000, max: 5, label: 'post-create' }),
  guard(async (req, res) => {
    const { title, body, post_type = 'general', community_id = null } = req.body;

    if (!title || typeof title !== 'string' || !title.trim() || title.length > 280)
      return fail(res, ERRORS.VALIDATION_ERROR, 'title is required and must be under 280 characters');
    if (!body || typeof body !== 'string' || !body.trim() || body.length > 10000)
      return fail(res, ERRORS.VALIDATION_ERROR, 'body is required and must be under 10000 characters');
    if (moderateContent(title, body))
      return fail(res, ERRORS.VALIDATION_ERROR,
        'Your post contains content that violates the Polymart Community Standards. Please review our guidelines and resubmit.'
      );

    let resolvedCommunityId = null;
    if (community_id) {
      resolvedCommunityId = parseInt(community_id) || null;
      if (resolvedCommunityId) {
        const [[comm]] = await pool.query(
          'SELECT id, post_permission, post_tags FROM communities WHERE id = ?', [resolvedCommunityId]
        );
        if (!comm) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

        const allowedTypes = comm.post_tags
          ? new Set(comm.post_tags.map(t => t.key))
          : VALID_TYPES;
        if (!allowedTypes.has(post_type))
          return fail(res, ERRORS.INVALID_VALUE, 'Invalid post type for this community');

        const [[ban]] = await pool.query(
          'SELECT id FROM community_bans WHERE community_id = ? AND clerk_id = ?',
          [resolvedCommunityId, req.userId]
        );
        if (ban) return fail(res, ERRORS.FORBIDDEN, 'You are banned from posting in this community');

        if (comm.post_permission === 'members') {
          const [[membership]] = await pool.query(
            'SELECT role FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
            [resolvedCommunityId, req.userId]
          );
          if (!membership) return fail(res, ERRORS.FORBIDDEN, 'You must join this community before posting');
        } else if (comm.post_permission === 'chosen') {
          const [[membership]] = await pool.query(
            'SELECT role FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
            [resolvedCommunityId, req.userId]
          );
          const isMod = membership?.role === 'moderator' || membership?.role === 'owner';
          if (!isMod) {
            const [[allowed]] = await pool.query(
              'SELECT id FROM community_post_allowlist WHERE community_id = ? AND clerk_id = ?',
              [resolvedCommunityId, req.userId]
            );
            if (!allowed) return fail(res, ERRORS.FORBIDDEN, 'Posting in this community is restricted to selected members');
          }
        }
      }
    } else {
      if (!VALID_TYPES.has(post_type)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid post_type');
    }

    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?', [req.userId]
    );
    const shareId = generateShareId();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO community_posts (community_id, share_id, clerk_id, display_name, avatar_url, title, body, post_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [resolvedCommunityId, shareId, req.userId, profile?.display_name ?? null, profile?.avatar_url ?? null,
         title.trim(), body.trim(), post_type]
      );
      if (resolvedCommunityId) {
        await conn.query('UPDATE communities SET post_count = post_count + 1 WHERE id = ?', [resolvedCommunityId]);
      }
      await conn.commit();
      return success(res, {
        id: result.insertId, share_id: shareId, clerk_id: req.userId,
        display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null,
        title: title.trim(), body: body.trim(), post_type,
        community_id: resolvedCommunityId, is_pinned: 0, is_removed: 0, likes: 0,
        comment_count: 0, created_at: new Date().toISOString(),
      }, undefined, HTTP.CREATED);
    } catch (err) {
      await conn.rollback(); throw err;
    } finally {
      conn.release();
    }
  })
);

// ── GET /community/posts/share/:shareId ──────────────────────────────────────

router.get('/posts/share/:shareId', guard(async (req, res) => {
  const [[post]] = await pool.query(
    `SELECT cp.id, cp.share_id, cp.clerk_id,
            COALESCE(cp.display_name, up.display_name) AS display_name,
            COALESCE(cp.avatar_url, up.avatar_url) AS avatar_url,
            cp.title, cp.body, cp.post_type, cp.likes, cp.created_at,
            COUNT(cc.id) AS comment_count,
            COALESCE(up.is_verified, 0) AS author_verified,
            up.profile_id AS author_profile_id,
            (up.email = ?) AS author_is_staff
     FROM community_posts cp
     LEFT JOIN community_comments cc ON cc.post_id = cp.id
     LEFT JOIN user_profiles up ON up.clerk_id = cp.clerk_id
     WHERE cp.share_id = ? GROUP BY cp.id`,
    [STAFF_EMAIL, req.params.shareId]
  );
  if (!post) return fail(res, ERRORS.NOT_FOUND, 'Post not found');
  return success(res, post);
}));

// ── PUT /community/posts/:id ──────────────────────────────────────────────────

router.put('/posts/:id', requireAuth(), guard(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

  const { title, body, post_type } = req.body;
  if (!title || typeof title !== 'string' || !title.trim() || title.length > 280)
    return fail(res, ERRORS.VALIDATION_ERROR, 'title is required and must be under 280 characters');
  if (!body || typeof body !== 'string' || !body.trim() || body.length > 10000)
    return fail(res, ERRORS.VALIDATION_ERROR, 'body is required and must be under 10000 characters');

  const type    = post_type && VALID_TYPES.has(post_type) ? post_type : null;
  const setParts = ['title = ?', 'body = ?'];
  const vals     = [title.trim(), body.trim()];
  if (type) { setParts.push('post_type = ?'); vals.push(type); }
  vals.push(postId, req.userId);

  const [result] = await pool.query(
    `UPDATE community_posts SET ${setParts.join(', ')} WHERE id = ? AND clerk_id = ?`, vals
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.FORBIDDEN, 'Not found or not yours');
  return success(res, { ok: true, title: title.trim(), body: body.trim(), post_type: type });
}));

// ── POST /community/posts/:id/like ────────────────────────────────────────────

router.post('/posts/:id/like', requireAuth(), guard(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(
      'INSERT IGNORE INTO community_likes (post_id, clerk_id) VALUES (?, ?)', [postId, req.userId]
    );
    if (ins.affectedRows === 0) {
      await conn.rollback();
      return success(res, { ok: true, already_liked: true });
    }
    const [upd] = await conn.query('UPDATE community_posts SET likes = likes + 1 WHERE id = ?', [postId]);
    if (upd.affectedRows === 0) { await conn.rollback(); return fail(res, ERRORS.NOT_FOUND, 'Post not found'); }
    await conn.commit();
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

// ── DELETE /community/posts/:id ───────────────────────────────────────────────

router.delete('/posts/:id', requireAuth(), guard(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

  const [result] = await pool.query(
    'DELETE FROM community_posts WHERE id = ? AND clerk_id = ?', [postId, req.userId]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.FORBIDDEN, 'Not found or not yours');
  return success(res, { ok: true });
}));

// ── GET /community/posts/:id/comments ────────────────────────────────────────

router.get('/posts/:id/comments', guard(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

  const [rows] = await pool.query(
    `SELECT cc.id, cc.post_id, cc.parent_id, cc.clerk_id,
            COALESCE(cc.display_name, up.display_name) AS display_name,
            COALESCE(cc.avatar_url, up.avatar_url) AS avatar_url,
            cc.body, cc.created_at,
            up.profile_id AS author_profile_id,
            (up.email = ?) AS author_is_staff
     FROM community_comments cc
     LEFT JOIN user_profiles up ON up.clerk_id = cc.clerk_id
     WHERE cc.post_id = ? ORDER BY cc.created_at ASC LIMIT 1000`,
    [STAFF_EMAIL, postId]
  );
  return success(res, { comments: rows });
}));

// ── POST /community/posts/:id/comments ───────────────────────────────────────

router.post('/posts/:id/comments',
  requireAuth(),
  rateLimit({ windowMs: 3_600_000, max: 30, label: 'comment-create' }),
  guard(async (req, res) => {
    const postId = parseInt(req.params.id);
    if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

    const { body, parent_id } = req.body;
    if (!body || typeof body !== 'string' || !body.trim() || body.length > 2000)
      return fail(res, ERRORS.VALIDATION_ERROR, 'Comment must be between 1 and 2000 characters');
    if (moderateContent(body))
      return fail(res, ERRORS.VALIDATION_ERROR,
        'Your comment contains content that violates the Polymart Community Standards.'
      );

    let parentId = null;
    if (parent_id != null) {
      parentId = parseInt(parent_id);
      if (!parentId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid parent_id');
      const [[parent]] = await pool.query(
        'SELECT id FROM community_comments WHERE id = ? AND post_id = ?', [parentId, postId]
      );
      if (!parent) return fail(res, ERRORS.NOT_FOUND, 'Parent comment not found in this post');
    }

    const [[post]] = await pool.query('SELECT id FROM community_posts WHERE id = ?', [postId]);
    if (!post) return fail(res, ERRORS.NOT_FOUND, 'Post not found');

    const [[profile]] = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE clerk_id = ?', [req.userId]
    );
    const [result] = await pool.query(
      `INSERT INTO community_comments (post_id, parent_id, clerk_id, display_name, avatar_url, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [postId, parentId, req.userId, profile?.display_name ?? null, profile?.avatar_url ?? null, body.trim()]
    );

    return success(res, {
      id: result.insertId, post_id: postId, parent_id: parentId, clerk_id: req.userId,
      display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null,
      body: body.trim(), created_at: new Date().toISOString(),
    }, undefined, HTTP.CREATED);
  })
);

// ── DELETE /community/comments/:id ───────────────────────────────────────────

router.delete('/comments/:id', requireAuth(), guard(async (req, res) => {
  const commentId = parseInt(req.params.id);
  if (!commentId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid comment id');

  const [result] = await pool.query(
    'DELETE FROM community_comments WHERE id = ? AND clerk_id = ?', [commentId, req.userId]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.FORBIDDEN, 'Not found or not yours');
  return success(res, { ok: true });
}));

// ── POST /community/posts/:id/report ─────────────────────────────────────────

router.post('/posts/:id/report', requireAuth(), guard(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (!postId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid post id');

  const { reason } = req.body;
  if (!reason || !VALID_REASONS.has(reason)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid reason');

  await pool.query(
    'INSERT IGNORE INTO community_reports (post_id, reporter_clerk_id, reason) VALUES (?, ?, ?)',
    [postId, req.userId, reason]
  );
  return success(res, { ok: true });
}));

export default router;
