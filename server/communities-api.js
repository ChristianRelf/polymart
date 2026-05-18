import { Router }        from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { randomBytes }   from 'crypto';
import { fileURLToPath } from 'url';
import path              from 'path';
import fs                from 'fs/promises';
import { mkdirSync }     from 'fs';
import multer            from 'multer';
import sharp             from 'sharp';
import pool              from './db.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'communities');
mkdirSync(UPLOADS_DIR, { recursive: true });

const memStorage = multer.memoryStorage();
const uploadIcon   = multer({ storage: memStorage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(f.mimetype)) });
const uploadBanner = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, ['image/jpeg','image/png','image/webp','image/gif'].includes(f.mimetype)) });

async function processAndSave(buffer, filename, sharpPipeline) {
  const filepath = path.join(UPLOADS_DIR, filename);
  await sharpPipeline(sharp(buffer)).toFile(filepath);
  return `/uploads/communities/${filename}`;
}

const VALID_SLUG    = /^[a-z0-9-]{3,64}$/;
const VALID_REASONS = new Set(['Spam', 'Misinformation', 'Inappropriate', 'Off-topic', 'Hate speech']);

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCommunityBySlug(slug) {
  const [[row]] = await pool.query('SELECT * FROM communities WHERE slug = ?', [slug]);
  return row ?? null;
}

async function getMembership(communityId, clerkId) {
  const [[row]] = await pool.query(
    'SELECT role FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
    [communityId, clerkId]
  );
  return row ?? null;
}

async function isBanned(communityId, clerkId) {
  const [[row]] = await pool.query(
    'SELECT id FROM community_bans WHERE community_id = ? AND clerk_id = ?',
    [communityId, clerkId]
  );
  return !!row;
}

async function requireMod(req, res, communityId) {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return null; }
  const m = await getMembership(communityId, userId);
  if (!m || (m.role !== 'moderator' && m.role !== 'owner')) {
    res.status(403).json({ error: 'Moderator access required' }); return null;
  }
  return { userId, role: m.role };
}

async function requireOwner(req, res, communityId) {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: 'Authentication required' }); return null; }
  const m = await getMembership(communityId, userId);
  if (!m || m.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' }); return null;
  }
  return userId;
}

async function logModAction(communityId, modClerkId, actionType, opts = {}) {
  await pool.query(
    `INSERT INTO community_mod_log (community_id, mod_clerk_id, action_type, target_clerk_id, target_post_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [communityId, modClerkId, actionType, opts.targetClerkId ?? null, opts.targetPostId ?? null, opts.details ?? null]
  );
}

// ── GET /communities/my-mod-history ──────────────────────────────────────────
// Must be registered before /:slug to avoid being shadowed.
// Returns mod actions taken against the current user across all communities.
router.get('/my-mod-history', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const [rows] = await pool.query(
      `SELECT ml.action_type, ml.details, ml.created_at,
              c.slug, c.display_name AS community_name,
              COALESCE(pm.display_name, ml.mod_clerk_id) AS mod_name,
              cp.title AS post_title
       FROM community_mod_log ml
       JOIN communities c ON c.id = ml.community_id
       LEFT JOIN user_profiles pm ON pm.clerk_id = ml.mod_clerk_id
       LEFT JOIN community_posts cp ON cp.id = ml.target_post_id
       WHERE ml.target_clerk_id = ?
       ORDER BY ml.created_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error('[communities-api] GET /my-mod-history:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities ──────────────────────────────────────────────────────────
// Public. List communities with optional search and sort.
router.get('/', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 20;
  const offset = (page - 1) * limit;
  const q      = req.query.q?.trim() || '';
  const sort   = req.query.sort === 'new' ? 'c.created_at DESC' : 'c.member_count DESC';

  try {
    const where  = q ? 'WHERE c.slug LIKE ? OR c.display_name LIKE ?' : '';
    const params = q ? [`%${q}%`, `%${q}%`] : [];

    const [rows] = await pool.query(
      `SELECT c.id, c.slug, c.display_name, c.description, c.icon_url, c.banner_url,
              c.member_count, c.post_count, c.owner_clerk_id, c.created_at, c.verification_type
       FROM communities c
       ${where}
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM communities c ${where}`,
      params
    );
    res.json({ communities: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[communities-api] GET /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities/mine ─────────────────────────────────────────────────────
// Auth required. Returns communities the current user has joined.
router.get('/mine', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.slug, c.display_name, c.description, c.icon_url, c.banner_url,
              c.member_count, c.post_count, c.owner_clerk_id, c.created_at, c.verification_type, m.role
       FROM communities c
       JOIN community_memberships m ON m.community_id = c.id AND m.clerk_id = ?
       ORDER BY m.joined_at DESC
       LIMIT 200`,
      [userId]
    );
    res.json({ communities: rows });
  } catch (err) {
    console.error('[communities-api] GET /mine:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities ─────────────────────────────────────────────────────────
// Auth required. Create a new community. Owner is auto-joined as 'owner'.
router.post('/', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  // Rate-limit: 3 communities per user total.
  const [[{ owned }]] = await pool.query(
    'SELECT COUNT(*) AS owned FROM communities WHERE owner_clerk_id = ?', [userId]
  );
  if (owned >= 10) return res.status(429).json({ error: 'Maximum of 10 communities per account' });

  const { slug, display_name, description = '' } = req.body;

  if (!slug || !VALID_SLUG.test(slug))
    return res.status(400).json({ error: 'Slug must be 3-64 lowercase letters, numbers, or hyphens' });
  if (!display_name || typeof display_name !== 'string' || !display_name.trim() || display_name.length > 128)
    return res.status(400).json({ error: 'display_name is required (max 128 chars)' });

  try {
    const [[existing]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [slug]);
    if (existing) return res.status(409).json({ error: 'That community name is already taken' });

    const [result] = await pool.query(
      `INSERT INTO communities (slug, display_name, description, owner_clerk_id, member_count)
       VALUES (?, ?, ?, ?, 1)`,
      [slug, display_name.trim(), description.trim(), userId]
    );
    const communityId = result.insertId;

    await pool.query(
      `INSERT INTO community_memberships (community_id, clerk_id, role) VALUES (?, ?, 'owner')`,
      [communityId, userId]
    );

    res.status(201).json({
      id: communityId, slug, display_name: display_name.trim(),
      description: description.trim(), icon_url: null, banner_url: null,
      owner_clerk_id: userId, member_count: 1, post_count: 0,
      created_at: new Date().toISOString(), is_member: true, user_role: 'owner',
    });
  } catch (err) {
    console.error('[communities-api] POST /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities/:slug ────────────────────────────────────────────────────
// Public. Returns community info + rules. Augments with is_member/user_role if authed.
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const [rules] = await pool.query(
      'SELECT id, title, description, display_order FROM community_rules WHERE community_id = ? ORDER BY display_order ASC, id ASC',
      [community.id]
    );

    const [mods] = await pool.query(
      `SELECT m.clerk_id, m.role, COALESCE(p.display_name, m.clerk_id) AS display_name, p.avatar_url
       FROM community_memberships m
       LEFT JOIN user_profiles p ON p.clerk_id = m.clerk_id
       WHERE m.community_id = ? AND m.role IN ('owner','moderator')
       ORDER BY FIELD(m.role,'owner','moderator'), m.joined_at ASC`,
      [community.id]
    );

    let is_member = false, user_role = null, is_banned = false;
    const { userId } = getAuth(req);
    if (userId) {
      const m = await getMembership(community.id, userId);
      is_member = !!m;
      user_role = m?.role ?? null;
      is_banned = await isBanned(community.id, userId);
    }

    res.json({ ...community, rules, moderators: mods, is_member, user_role, is_banned });
  } catch (err) {
    console.error('[communities-api] GET /:slug:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /communities/:slug ────────────────────────────────────────────────────
// Mod/Owner. Update display_name or description.
// Verified/official communities: display_name can only be changed by Polymart staff (admin role).
router.put('/:slug', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const { display_name, description } = req.body;
  const updates = [], vals = [];

  if (display_name != null) {
    if (typeof display_name !== 'string' || !display_name.trim() || display_name.length > 128)
      return res.status(400).json({ error: 'display_name must be 1-128 chars' });

    const isVerified = community.verification_type === 'verified' || community.verification_type === 'official';
    if (isVerified) {
      try {
        const user = await clerkClient.users.getUser(mod.userId);
        if (user.publicMetadata?.role !== 'admin') {
          return res.status(403).json({ error: 'Community name can only be changed by Polymart staff for verified communities' });
        }
      } catch {
        return res.status(403).json({ error: 'Unable to verify permissions' });
      }
    }

    updates.push('display_name = ?'); vals.push(display_name.trim());
  }

  if (description != null) { updates.push('description = ?'); vals.push(String(description).trim()); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  try {
    await pool.query(`UPDATE communities SET ${updates.join(', ')} WHERE id = ?`, [...vals, community.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[communities-api] PUT /:slug:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /communities/:slug ─────────────────────────────────────────────────
// Owner only. Deletes community + memberships. Posts remain (community_id becomes orphaned).
router.delete('/:slug', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const ownerId = await requireOwner(req, res, community.id);
  if (!ownerId) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM community_memberships       WHERE community_id = ?', [community.id]);
    await conn.query('DELETE FROM community_bans              WHERE community_id = ?', [community.id]);
    await conn.query('DELETE FROM community_rules             WHERE community_id = ?', [community.id]);
    await conn.query('DELETE FROM community_mod_log           WHERE community_id = ?', [community.id]);
    await conn.query('DELETE FROM community_community_reports WHERE community_id = ?', [community.id]);
    await conn.query('UPDATE community_posts SET community_id = NULL WHERE community_id = ?', [community.id]);
    await conn.query('DELETE FROM communities WHERE id = ?', [community.id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[communities-api] DELETE /:slug:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── POST /communities/:slug/report ────────────────────────────────────────────
router.post('/:slug/report', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const { reason } = req.body;
  if (!reason || !VALID_REASONS.has(reason)) return res.status(400).json({ error: 'Invalid reason' });

  try {
    await pool.query(
      `INSERT IGNORE INTO community_community_reports (community_id, reporter_clerk_id, reason) VALUES (?, ?, ?)`,
      [community.id, userId, reason]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[communities-api] POST /:slug/report:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/join ──────────────────────────────────────────────
router.post('/:slug/join', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  if (await isBanned(community.id, userId))
    return res.status(403).json({ error: 'You are banned from this community' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT IGNORE INTO community_memberships (community_id, clerk_id, role) VALUES (?, ?, 'member')`,
      [community.id, userId]
    );
    if (result.affectedRows > 0) {
      await conn.query('UPDATE communities SET member_count = member_count + 1 WHERE id = ?', [community.id]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[communities-api] POST /:slug/join:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── POST /communities/:slug/leave ─────────────────────────────────────────────
router.post('/:slug/leave', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const m = await getMembership(community.id, userId);
  if (!m) return res.status(400).json({ error: 'You are not a member' });
  if (m.role === 'owner') return res.status(400).json({ error: 'Owners cannot leave — delete the community instead' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'DELETE FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
      [community.id, userId]
    );
    await conn.query('UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?', [community.id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[communities-api] POST /:slug/leave:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── GET /communities/:slug/members ────────────────────────────────────────────
router.get('/:slug/members', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 50;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT m.clerk_id, m.role, m.joined_at,
              COALESCE(p.display_name, m.clerk_id) AS display_name, p.avatar_url
       FROM community_memberships m
       LEFT JOIN user_profiles p ON p.clerk_id = m.clerk_id
       WHERE m.community_id = ?
       ORDER BY FIELD(m.role,'owner','moderator','member'), m.joined_at ASC
       LIMIT ? OFFSET ?`,
      [community.id, limit, offset]
    );
    res.json({ members: rows });
  } catch (err) {
    console.error('[communities-api] GET /:slug/members:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/upload/icon ───────────────────────────────────────
router.post('/:slug/upload/icon', async (req, res, next) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  uploadIcon.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Max 5 MB' : (err.message || 'Upload error') });
    if (!req.file) return res.status(400).json({ error: 'No valid image (jpeg/png/webp, max 5 MB)' });
    try {
      const filename = randomBytes(16).toString('hex') + '.webp';
      const url = await processAndSave(req.file.buffer, filename, s =>
        s.resize(256, 256, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 })
      );
      await pool.query('UPDATE communities SET icon_url = ? WHERE id = ?', [url, community.id]);
      res.json({ url });
    } catch (e) {
      console.error('[communities-api] icon sharp:', e.message);
      res.status(500).json({ error: 'Image processing failed' });
    }
  });
});

// ── POST /communities/:slug/upload/banner ─────────────────────────────────────
router.post('/:slug/upload/banner', async (req, res, next) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  uploadBanner.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Max 10 MB' : (err.message || 'Upload error') });
    if (!req.file) return res.status(400).json({ error: 'No valid image (jpeg/png/webp/gif, max 10 MB)' });
    try {
      const filename = randomBytes(16).toString('hex') + '.webp';
      const url = await processAndSave(req.file.buffer, filename, s =>
        s.resize(1200, 400, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 })
      );
      await pool.query('UPDATE communities SET banner_url = ? WHERE id = ?', [url, community.id]);
      res.json({ url });
    } catch (e) {
      console.error('[communities-api] banner sharp:', e.message);
      res.status(500).json({ error: 'Image processing failed' });
    }
  });
});

// ── GET /communities/:slug/rules ──────────────────────────────────────────────
router.get('/:slug/rules', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, display_order FROM community_rules WHERE community_id = ? ORDER BY display_order ASC, id ASC',
      [community.id]
    );
    res.json({ rules: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/rules ─────────────────────────────────────────────
router.post('/:slug/rules', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const { title, description = '' } = req.body;
  if (!title || typeof title !== 'string' || !title.trim() || title.length > 128)
    return res.status(400).json({ error: 'title required (max 128 chars)' });

  try {
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) AS maxOrder FROM community_rules WHERE community_id = ?',
      [community.id]
    );
    const [result] = await pool.query(
      'INSERT INTO community_rules (community_id, title, description, display_order) VALUES (?, ?, ?, ?)',
      [community.id, title.trim(), description.trim(), maxOrder + 1]
    );
    res.status(201).json({ id: result.insertId, title: title.trim(), description: description.trim(), display_order: maxOrder + 1 });
  } catch (err) {
    console.error('[communities-api] POST /:slug/rules:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /communities/:slug/rules/:id ──────────────────────────────────────────
router.put('/:slug/rules/:id', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const ruleId = parseInt(req.params.id);
  const { title, description } = req.body;
  const updates = [], vals = [];
  if (title != null) { updates.push('title = ?'); vals.push(String(title).trim()); }
  if (description != null) { updates.push('description = ?'); vals.push(String(description).trim()); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  try {
    const [result] = await pool.query(
      `UPDATE community_rules SET ${updates.join(', ')} WHERE id = ? AND community_id = ?`,
      [...vals, ruleId, community.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /communities/:slug/rules/:id ───────────────────────────────────────
router.delete('/:slug/rules/:id', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  try {
    const [result] = await pool.query(
      'DELETE FROM community_rules WHERE id = ? AND community_id = ?',
      [parseInt(req.params.id), community.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities/:slug/mod/queue ──────────────────────────────────────────
// Returns post reports for this community's posts.
router.get('/:slug/mod/queue', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 20;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT cr.id, cr.post_id, cr.reporter_clerk_id, cr.reason, cr.created_at,
              cp.title, cp.clerk_id AS post_author_clerk_id,
              COALESCE(p.display_name, cr.reporter_clerk_id) AS reporter_name
       FROM community_reports cr
       JOIN community_posts cp ON cp.id = cr.post_id
       LEFT JOIN user_profiles p ON p.clerk_id = cr.reporter_clerk_id
       WHERE cp.community_id = ?
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [community.id, limit, offset]
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error('[communities-api] GET /:slug/mod/queue:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/pin/:postId ───────────────────────────────────
router.post('/:slug/mod/pin/:postId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  try {
    const [result] = await pool.query(
      'UPDATE community_posts SET is_pinned = 1 WHERE id = ? AND community_id = ?',
      [postId, community.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found in this community' });
    await logModAction(community.id, mod.userId, 'pin', { targetPostId: postId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/unpin/:postId ─────────────────────────────────
router.post('/:slug/mod/unpin/:postId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  try {
    await pool.query('UPDATE community_posts SET is_pinned = 0 WHERE id = ? AND community_id = ?', [postId, community.id]);
    await logModAction(community.id, mod.userId, 'unpin', { targetPostId: postId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/remove/:postId ────────────────────────────────
router.post('/:slug/mod/remove/:postId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  const { reason } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE community_posts SET is_removed = 1 WHERE id = ? AND community_id = ?',
      [postId, community.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found in this community' });
    await logModAction(community.id, mod.userId, 'remove_post', { targetPostId: postId, details: reason || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/restore/:postId ───────────────────────────────
router.post('/:slug/mod/restore/:postId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  try {
    await pool.query('UPDATE community_posts SET is_removed = 0 WHERE id = ? AND community_id = ?', [postId, community.id]);
    await logModAction(community.id, mod.userId, 'restore_post', { targetPostId: postId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/bans ──────────────────────────────────────────
router.post('/:slug/mod/bans', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const { clerk_id, reason = '' } = req.body;
  if (!clerk_id || typeof clerk_id !== 'string')
    return res.status(400).json({ error: 'clerk_id required' });
  if (typeof reason === 'string' && reason.length > 500)
    return res.status(400).json({ error: 'Reason too long (max 500 characters)' });

  // Mods cannot ban owners or other mods (unless they are the owner).
  const target = await getMembership(community.id, clerk_id);
  if (target && target.role === 'owner') return res.status(403).json({ error: 'Cannot ban the community owner' });
  if (target && target.role === 'moderator' && mod.role !== 'owner')
    return res.status(403).json({ error: 'Only the owner can ban moderators' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO community_bans (community_id, clerk_id, banned_by, reason)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE banned_by = VALUES(banned_by), reason = VALUES(reason), banned_at = NOW()`,
      [community.id, clerk_id, mod.userId, reason.trim()]
    );
    const [del] = await conn.query(
      'DELETE FROM community_memberships WHERE community_id = ? AND clerk_id = ?',
      [community.id, clerk_id]
    );
    if (del.affectedRows > 0) {
      await conn.query('UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?', [community.id]);
    }
    await conn.commit();
    await logModAction(community.id, mod.userId, 'ban', { targetClerkId: clerk_id, details: reason.trim() || null });
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[communities-api] POST /:slug/mod/bans:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── DELETE /communities/:slug/mod/bans/:clerkId ───────────────────────────────
router.delete('/:slug/mod/bans/:clerkId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  try {
    const [result] = await pool.query(
      'DELETE FROM community_bans WHERE community_id = ? AND clerk_id = ?',
      [community.id, req.params.clerkId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ban not found' });
    await logModAction(community.id, mod.userId, 'unban', { targetClerkId: req.params.clerkId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities/:slug/mod/bans ───────────────────────────────────────────
router.get('/:slug/mod/bans', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  try {
    const [rows] = await pool.query(
      `SELECT b.clerk_id, b.banned_by, b.reason, b.banned_at,
              COALESCE(p.display_name, b.clerk_id) AS display_name,
              COALESCE(pb.display_name, b.banned_by) AS banned_by_name
       FROM community_bans b
       LEFT JOIN user_profiles p  ON p.clerk_id  = b.clerk_id
       LEFT JOIN user_profiles pb ON pb.clerk_id = b.banned_by
       WHERE b.community_id = ?
       ORDER BY b.banned_at DESC`,
      [community.id]
    );
    res.json({ bans: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /communities/:slug/mod/moderators ────────────────────────────────────
// Owner only. Promote a member to moderator.
router.post('/:slug/mod/moderators', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const ownerId = await requireOwner(req, res, community.id);
  if (!ownerId) return;

  const { clerk_id } = req.body;
  if (!clerk_id) return res.status(400).json({ error: 'clerk_id required' });

  try {
    const [result] = await pool.query(
      `UPDATE community_memberships SET role = 'moderator' WHERE community_id = ? AND clerk_id = ? AND role = 'member'`,
      [community.id, clerk_id]
    );
    if (result.affectedRows === 0)
      return res.status(400).json({ error: 'User is not a member or is already a moderator' });
    await logModAction(community.id, ownerId, 'add_mod', { targetClerkId: clerk_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /communities/:slug/mod/moderators/:clerkId ────────────────────────
// Owner only. Demote a moderator back to member.
router.delete('/:slug/mod/moderators/:clerkId', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const ownerId = await requireOwner(req, res, community.id);
  if (!ownerId) return;

  try {
    const [result] = await pool.query(
      `UPDATE community_memberships SET role = 'member' WHERE community_id = ? AND clerk_id = ? AND role = 'moderator'`,
      [community.id, req.params.clerkId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Moderator not found' });
    await logModAction(community.id, ownerId, 'remove_mod', { targetClerkId: req.params.clerkId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /communities/:slug/mod/log ────────────────────────────────────────────
router.get('/:slug/mod/log', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return res.status(404).json({ error: 'Community not found' });
  const mod = await requireMod(req, res, community.id);
  if (!mod) return;

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 30;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT ml.id, ml.action_type, ml.target_clerk_id, ml.target_post_id, ml.details, ml.created_at,
              COALESCE(pm.display_name, ml.mod_clerk_id) AS mod_name,
              COALESCE(pt.display_name, ml.target_clerk_id) AS target_name,
              cp.title AS post_title
       FROM community_mod_log ml
       LEFT JOIN user_profiles pm ON pm.clerk_id = ml.mod_clerk_id
       LEFT JOIN user_profiles pt ON pt.clerk_id = ml.target_clerk_id
       LEFT JOIN community_posts cp ON cp.id = ml.target_post_id
       WHERE ml.community_id = ?
       ORDER BY ml.created_at DESC
       LIMIT ? OFFSET ?`,
      [community.id, limit, offset]
    );
    res.json({ log: rows });
  } catch (err) {
    console.error('[communities-api] GET /:slug/mod/log:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
