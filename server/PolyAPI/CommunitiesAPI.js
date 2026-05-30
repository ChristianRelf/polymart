/**
 * PolyAPI · CommunitiesAPI
 *
 * Community CRUD, membership, moderation (ban/unban, mod promotion),
 * rules management, and image upload routes.
 *
 * Mount point: /api/v1/communities
 */

import { getAuth, clerkClient } from '@clerk/express';
import { randomBytes }          from 'crypto';
import { fileURLToPath }        from 'url';
import path                     from 'path';
import { mkdirSync }            from 'fs';
import multer                   from 'multer';
import sharp                    from 'sharp';
import { dbUser as pool }       from '../db.js';
import { createRouter }         from './Router.js';
import { requireAuth }          from './Middleware.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';

// ── Upload setup ──────────────────────────────────────────────────────────────

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'communities');
mkdirSync(UPLOADS_DIR, { recursive: true });

const memStorage   = multer.memoryStorage();
const uploadIcon   = multer({ storage: memStorage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(f.mimetype)) });
const uploadBanner = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, ['image/jpeg','image/png','image/webp','image/gif'].includes(f.mimetype)) });

async function processAndSave(buffer, filename, sharpPipeline) {
  const filepath = path.join(UPLOADS_DIR, filename);
  await sharpPipeline(sharp(buffer)).toFile(filepath);
  return `/uploads/communities/${filename}`;
}

// ── Validation constants ──────────────────────────────────────────────────────

const VALID_SLUG    = /^[a-z0-9-]{3,64}$/;
const VALID_REASONS = new Set(['Spam', 'Misinformation', 'Inappropriate', 'Off-topic', 'Hate speech']);
const VALID_COLORS  = new Set(['zinc','emerald','blue','amber','rose','violet','orange','sky']);
const VALID_TAG_KEY = /^[a-z0-9-]{1,32}$/;

// ── DB helpers ────────────────────────────────────────────────────────────────

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

async function logModAction(communityId, modClerkId, actionType, opts = {}) {
  await pool.query(
    `INSERT INTO community_mod_log (community_id, mod_clerk_id, action_type, target_clerk_id, target_post_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [communityId, modClerkId, actionType, opts.targetClerkId ?? null, opts.targetPostId ?? null, opts.details ?? null]
  );
}

// ── Mod/owner auth helpers ────────────────────────────────────────────────────

async function assertMod(req, res, communityId) {
  const { userId } = getAuth(req);
  if (!userId) { fail(res, ERRORS.UNAUTHENTICATED, 'Authentication required'); return null; }
  const m = await getMembership(communityId, userId);
  if (!m || (m.role !== 'moderator' && m.role !== 'owner')) {
    fail(res, ERRORS.FORBIDDEN, 'Moderator access required');
    return null;
  }
  return { userId, role: m.role };
}

async function assertOwner(req, res, communityId) {
  const { userId } = getAuth(req);
  if (!userId) { fail(res, ERRORS.UNAUTHENTICATED, 'Authentication required'); return null; }
  const m = await getMembership(communityId, userId);
  if (!m || m.role !== 'owner') { fail(res, ERRORS.FORBIDDEN, 'Owner access required'); return null; }
  return userId;
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[communities-api]' });

// ── GET /communities/my-mod-history ──────────────────────────────────────────

router.get('/my-mod-history', requireAuth(), guard(async (req, res) => {
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
     ORDER BY ml.created_at DESC LIMIT 100`,
    [req.userId]
  );
  return success(res, { history: rows });
}));

// ── GET /communities ──────────────────────────────────────────────────────────

router.get('/', guard(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 20;
  const offset = (page - 1) * limit;
  const q      = req.query.q?.trim() || '';
  const sort   = req.query.sort === 'new' ? 'c.created_at DESC' : 'c.member_count DESC';

  const where  = q ? 'WHERE c.slug LIKE ? OR c.display_name LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];

  const [rows] = await pool.query(
    `SELECT c.id, c.slug, c.display_name, c.description, c.icon_url, c.banner_url,
            c.member_count, c.post_count, c.owner_clerk_id, c.created_at, c.verification_type
     FROM communities c ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM communities c ${where}`, params);
  return success(res, { communities: rows, total, page, pages: Math.ceil(total / limit) });
}));

// ── GET /communities/mine ─────────────────────────────────────────────────────

router.get('/mine', requireAuth(), guard(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.slug, c.display_name, c.description, c.icon_url, c.banner_url,
            c.member_count, c.post_count, c.owner_clerk_id, c.created_at, c.verification_type, m.role
     FROM communities c
     JOIN community_memberships m ON m.community_id = c.id AND m.clerk_id = ?
     ORDER BY m.joined_at DESC LIMIT 200`,
    [req.userId]
  );
  return success(res, { communities: rows });
}));

// ── POST /communities ─────────────────────────────────────────────────────────

router.post('/', requireAuth(), guard(async (req, res) => {
  const [[{ owned }]] = await pool.query(
    'SELECT COUNT(*) AS owned FROM communities WHERE owner_clerk_id = ?', [req.userId]
  );
  if (owned >= 10) return fail(res, ERRORS.QUOTA_EXCEEDED, 'Maximum of 10 communities per account', HTTP.TOO_MANY_REQUESTS);

  const { slug, display_name, description = '' } = req.body;
  if (!slug || !VALID_SLUG.test(slug))
    return fail(res, ERRORS.VALIDATION_ERROR, 'Slug must be 3-64 lowercase letters, numbers, or hyphens');
  if (!display_name || typeof display_name !== 'string' || !display_name.trim() || display_name.length > 128)
    return fail(res, ERRORS.VALIDATION_ERROR, 'display_name is required (max 128 chars)');

  const [[existing]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [slug]);
  if (existing) return fail(res, ERRORS.CONFLICT, 'That community name is already taken');

  const [result] = await pool.query(
    `INSERT INTO communities (slug, display_name, description, owner_clerk_id, member_count) VALUES (?, ?, ?, ?, 1)`,
    [slug, display_name.trim(), description.trim(), req.userId]
  );
  const communityId = result.insertId;
  await pool.query(
    `INSERT INTO community_memberships (community_id, clerk_id, role) VALUES (?, ?, 'owner')`,
    [communityId, req.userId]
  );

  return success(res, {
    id: communityId, slug, display_name: display_name.trim(),
    description: description.trim(), icon_url: null, banner_url: null,
    owner_clerk_id: req.userId, member_count: 1, post_count: 0,
    created_at: new Date().toISOString(), is_member: true, user_role: 'owner',
  }, undefined, HTTP.CREATED);
}));

// ── GET /communities/:slug ────────────────────────────────────────────────────

router.get('/:slug', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

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

  let is_member = false, user_role = null, is_banned = false, is_post_allowed = false;
  const { userId } = getAuth(req);
  if (userId) {
    const m = await getMembership(community.id, userId);
    is_member   = !!m;
    user_role   = m?.role ?? null;
    is_banned   = await isBanned(community.id, userId);

    const perm = community.post_permission;
    if (perm === 'everyone') {
      is_post_allowed = true;
    } else if (perm === 'members') {
      is_post_allowed = is_member;
    } else if (perm === 'chosen') {
      const isMod = user_role === 'moderator' || user_role === 'owner';
      if (isMod) {
        is_post_allowed = true;
      } else {
        const [[al]] = await pool.query(
          'SELECT id FROM community_post_allowlist WHERE community_id = ? AND clerk_id = ?',
          [community.id, userId]
        );
        is_post_allowed = !!al;
      }
    }
  }

  return success(res, { ...community, rules, moderators: mods, is_member, user_role, is_banned, is_post_allowed });
}));

// ── PUT /communities/:slug ────────────────────────────────────────────────────

router.put('/:slug', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const { display_name, description, post_permission, post_tags } = req.body;
  const updates = [], vals = [];

  if (display_name != null) {
    if (typeof display_name !== 'string' || !display_name.trim() || display_name.length > 128)
      return fail(res, ERRORS.VALIDATION_ERROR, 'display_name must be 1-128 chars');

    const isVerified = community.verification_type === 'verified' || community.verification_type === 'official';
    if (isVerified) {
      const user = await clerkClient.users.getUser(mod.userId);
      if (user.publicMetadata?.role !== 'admin')
        return fail(res, ERRORS.FORBIDDEN, 'Community name can only be changed by Polymart staff for verified communities');
    }
    updates.push('display_name = ?'); vals.push(display_name.trim());
  }

  if (description != null) { updates.push('description = ?'); vals.push(String(description).trim()); }

  if (post_permission != null || post_tags !== undefined) {
    if (mod.role !== 'owner') return fail(res, ERRORS.FORBIDDEN, 'Only the community owner can change post permissions and tags');

    if (post_permission != null) {
      if (!['everyone', 'members', 'chosen'].includes(post_permission))
        return fail(res, ERRORS.INVALID_VALUE, 'post_permission must be everyone, members, or chosen');
      updates.push('post_permission = ?'); vals.push(post_permission);
    }

    if (post_tags !== undefined) {
      if (post_tags === null) {
        updates.push('post_tags = NULL');
      } else {
        if (!Array.isArray(post_tags) || post_tags.length > 8)
          return fail(res, ERRORS.VALIDATION_ERROR, 'post_tags must be an array of up to 8 tags');
        for (const tag of post_tags) {
          if (!tag.key || !VALID_TAG_KEY.test(tag.key))
            return fail(res, ERRORS.VALIDATION_ERROR, 'Tag key must be 1-32 lowercase chars, digits, or hyphens');
          if (!tag.label || typeof tag.label !== 'string' || tag.label.length > 32)
            return fail(res, ERRORS.VALIDATION_ERROR, 'Tag label must be 1-32 chars');
          if (!VALID_COLORS.has(tag.color))
            return fail(res, ERRORS.INVALID_VALUE, `Invalid tag color: ${tag.color}`);
        }
        updates.push('post_tags = ?'); vals.push(JSON.stringify(post_tags));
      }
    }
  }

  if (!updates.length) return fail(res, ERRORS.VALIDATION_ERROR, 'Nothing to update');

  await pool.query(`UPDATE communities SET ${updates.join(', ')} WHERE id = ?`, [...vals, community.id]);
  return success(res, { ok: true });
}));

// ── DELETE /communities/:slug ─────────────────────────────────────────────────

router.delete('/:slug', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const ownerId = await assertOwner(req, res, community.id);
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
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

// ── POST /communities/:slug/report ────────────────────────────────────────────

router.post('/:slug/report', requireAuth(), guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const { reason } = req.body;
  if (!reason || !VALID_REASONS.has(reason)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid reason');

  await pool.query(
    'INSERT IGNORE INTO community_community_reports (community_id, reporter_clerk_id, reason) VALUES (?, ?, ?)',
    [community.id, req.userId, reason]
  );
  return success(res, { ok: true });
}));

// ── POST /communities/:slug/join ──────────────────────────────────────────────

router.post('/:slug/join', requireAuth(), guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  if (await isBanned(community.id, req.userId))
    return fail(res, ERRORS.FORBIDDEN, 'You are banned from this community');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT IGNORE INTO community_memberships (community_id, clerk_id, role) VALUES (?, ?, 'member')`,
      [community.id, req.userId]
    );
    if (result.affectedRows > 0) {
      await conn.query('UPDATE communities SET member_count = member_count + 1 WHERE id = ?', [community.id]);
    }
    await conn.commit();
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

// ── POST /communities/:slug/leave ─────────────────────────────────────────────

router.post('/:slug/leave', requireAuth(), guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const m = await getMembership(community.id, req.userId);
  if (!m) return fail(res, ERRORS.VALIDATION_ERROR, 'You are not a member', HTTP.BAD_REQUEST);
  if (m.role === 'owner') return fail(res, ERRORS.VALIDATION_ERROR, 'Owners cannot leave - delete the community instead', HTTP.BAD_REQUEST);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM community_memberships WHERE community_id = ? AND clerk_id = ?', [community.id, req.userId]);
    await conn.query('UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?', [community.id]);
    await conn.commit();
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

// ── GET /communities/:slug/members ────────────────────────────────────────────

router.get('/:slug/members', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 50;
  const offset = (page - 1) * limit;

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
  return success(res, { members: rows });
}));

// ── POST /communities/:slug/upload/icon ───────────────────────────────────────

router.post('/:slug/upload/icon', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  uploadIcon.single('image')(req, res, async err => {
    if (err) return fail(res, ERRORS.VALIDATION_ERROR, err.code === 'LIMIT_FILE_SIZE' ? 'Max 5 MB' : (err.message || 'Upload error'), HTTP.BAD_REQUEST);
    if (!req.file) return fail(res, ERRORS.MISSING_FIELD, 'No valid image (jpeg/png/webp, max 5 MB)', HTTP.BAD_REQUEST);
    try {
      const filename = randomBytes(16).toString('hex') + '.webp';
      const url      = await processAndSave(req.file.buffer, filename, s =>
        s.resize(256, 256, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 })
      );
      await pool.query('UPDATE communities SET icon_url = ? WHERE id = ?', [url, community.id]);
      return success(res, { url });
    } catch (e) {
      console.error('[communities-api] icon sharp:', e.message);
      return fail(res, ERRORS.INTERNAL, 'Image processing failed');
    }
  });
});

// ── POST /communities/:slug/upload/banner ─────────────────────────────────────

router.post('/:slug/upload/banner', async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  uploadBanner.single('image')(req, res, async err => {
    if (err) return fail(res, ERRORS.VALIDATION_ERROR, err.code === 'LIMIT_FILE_SIZE' ? 'Max 10 MB' : (err.message || 'Upload error'), HTTP.BAD_REQUEST);
    if (!req.file) return fail(res, ERRORS.MISSING_FIELD, 'No valid image (jpeg/png/webp/gif, max 10 MB)', HTTP.BAD_REQUEST);
    try {
      const filename = randomBytes(16).toString('hex') + '.webp';
      const url      = await processAndSave(req.file.buffer, filename, s =>
        s.resize(1200, 400, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 })
      );
      await pool.query('UPDATE communities SET banner_url = ? WHERE id = ?', [url, community.id]);
      return success(res, { url });
    } catch (e) {
      console.error('[communities-api] banner sharp:', e.message);
      return fail(res, ERRORS.INTERNAL, 'Image processing failed');
    }
  });
});

// ── Rules ─────────────────────────────────────────────────────────────────────

router.get('/:slug/rules', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const [rows] = await pool.query(
    'SELECT id, title, description, display_order FROM community_rules WHERE community_id = ? ORDER BY display_order ASC, id ASC',
    [community.id]
  );
  return success(res, { rules: rows });
}));

router.post('/:slug/rules', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const { title, description = '' } = req.body;
  if (!title || typeof title !== 'string' || !title.trim() || title.length > 128)
    return fail(res, ERRORS.VALIDATION_ERROR, 'title required (max 128 chars)');

  const [[{ maxOrder }]] = await pool.query(
    'SELECT COALESCE(MAX(display_order), 0) AS maxOrder FROM community_rules WHERE community_id = ?',
    [community.id]
  );
  const [result] = await pool.query(
    'INSERT INTO community_rules (community_id, title, description, display_order) VALUES (?, ?, ?, ?)',
    [community.id, title.trim(), description.trim(), maxOrder + 1]
  );
  return success(res, { id: result.insertId, title: title.trim(), description: description.trim(), display_order: maxOrder + 1 }, undefined, HTTP.CREATED);
}));

router.put('/:slug/rules/:id', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const ruleId = parseInt(req.params.id);
  const { title, description } = req.body;
  const updates = [], vals = [];
  if (title       != null) { updates.push('title = ?');       vals.push(String(title).trim()); }
  if (description != null) { updates.push('description = ?'); vals.push(String(description).trim()); }
  if (!updates.length) return fail(res, ERRORS.VALIDATION_ERROR, 'Nothing to update');

  const [result] = await pool.query(
    `UPDATE community_rules SET ${updates.join(', ')} WHERE id = ? AND community_id = ?`,
    [...vals, ruleId, community.id]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Rule not found');
  return success(res, { ok: true });
}));

router.delete('/:slug/rules/:id', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const [result] = await pool.query(
    'DELETE FROM community_rules WHERE id = ? AND community_id = ?',
    [parseInt(req.params.id), community.id]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Rule not found');
  return success(res, { ok: true });
}));

// ── Mod queue, pin, remove, restore ──────────────────────────────────────────

router.get('/:slug/mod/queue', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 20;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT cr.id, cr.post_id, cr.reporter_clerk_id, cr.reason, cr.created_at,
            cp.title, cp.clerk_id AS post_author_clerk_id,
            COALESCE(p.display_name, cr.reporter_clerk_id) AS reporter_name
     FROM community_reports cr
     JOIN community_posts cp ON cp.id = cr.post_id
     LEFT JOIN user_profiles p ON p.clerk_id = cr.reporter_clerk_id
     WHERE cp.community_id = ?
     ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`,
    [community.id, limit, offset]
  );
  return success(res, { reports: rows });
}));

router.post('/:slug/mod/pin/:postId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const postId   = parseInt(req.params.postId);
  const [result] = await pool.query(
    'UPDATE community_posts SET is_pinned = 1 WHERE id = ? AND community_id = ?',
    [postId, community.id]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Post not found in this community');
  await logModAction(community.id, mod.userId, 'pin', { targetPostId: postId });
  return success(res, { ok: true });
}));

router.post('/:slug/mod/unpin/:postId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  await pool.query('UPDATE community_posts SET is_pinned = 0 WHERE id = ? AND community_id = ?', [postId, community.id]);
  await logModAction(community.id, mod.userId, 'unpin', { targetPostId: postId });
  return success(res, { ok: true });
}));

router.post('/:slug/mod/remove/:postId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const postId   = parseInt(req.params.postId);
  const { reason } = req.body;
  const [result] = await pool.query(
    'UPDATE community_posts SET is_removed = 1 WHERE id = ? AND community_id = ?',
    [postId, community.id]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Post not found in this community');
  await logModAction(community.id, mod.userId, 'remove_post', { targetPostId: postId, details: reason || null });
  return success(res, { ok: true });
}));

router.post('/:slug/mod/restore/:postId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const postId = parseInt(req.params.postId);
  await pool.query('UPDATE community_posts SET is_removed = 0 WHERE id = ? AND community_id = ?', [postId, community.id]);
  await logModAction(community.id, mod.userId, 'restore_post', { targetPostId: postId });
  return success(res, { ok: true });
}));

// ── Bans ─────────────────────────────────────────────────────────────────────

router.post('/:slug/mod/bans', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const { clerk_id, reason = '' } = req.body;
  if (!clerk_id || typeof clerk_id !== 'string')
    return fail(res, ERRORS.MISSING_FIELD, 'clerk_id required');
  if (typeof reason === 'string' && reason.length > 500)
    return fail(res, ERRORS.TOO_LONG, 'Reason too long (max 500 characters)');

  const target = await getMembership(community.id, clerk_id);
  if (target?.role === 'owner') return fail(res, ERRORS.FORBIDDEN, 'Cannot ban the community owner');
  if (target?.role === 'moderator' && mod.role !== 'owner')
    return fail(res, ERRORS.FORBIDDEN, 'Only the owner can ban moderators');

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
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

router.delete('/:slug/mod/bans/:clerkId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const [result] = await pool.query(
    'DELETE FROM community_bans WHERE community_id = ? AND clerk_id = ?',
    [community.id, req.params.clerkId]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Ban not found');
  await logModAction(community.id, mod.userId, 'unban', { targetClerkId: req.params.clerkId });
  return success(res, { ok: true });
}));

router.get('/:slug/mod/bans', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const [rows] = await pool.query(
    `SELECT b.clerk_id, b.banned_by, b.reason, b.banned_at,
            COALESCE(p.display_name,  b.clerk_id)  AS display_name,
            COALESCE(pb.display_name, b.banned_by) AS banned_by_name
     FROM community_bans b
     LEFT JOIN user_profiles p  ON p.clerk_id  = b.clerk_id
     LEFT JOIN user_profiles pb ON pb.clerk_id = b.banned_by
     WHERE b.community_id = ? ORDER BY b.banned_at DESC`,
    [community.id]
  );
  return success(res, { bans: rows });
}));

// ── Moderator management ──────────────────────────────────────────────────────

router.post('/:slug/mod/moderators', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const ownerId = await assertOwner(req, res, community.id);
  if (!ownerId) return;

  const { clerk_id } = req.body;
  if (!clerk_id) return fail(res, ERRORS.MISSING_FIELD, 'clerk_id required');

  const [result] = await pool.query(
    `UPDATE community_memberships SET role = 'moderator' WHERE community_id = ? AND clerk_id = ? AND role = 'member'`,
    [community.id, clerk_id]
  );
  if (result.affectedRows === 0)
    return fail(res, ERRORS.VALIDATION_ERROR, 'User is not a member or is already a moderator', HTTP.BAD_REQUEST);
  await logModAction(community.id, ownerId, 'add_mod', { targetClerkId: clerk_id });
  return success(res, { ok: true });
}));

router.delete('/:slug/mod/moderators/:clerkId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const ownerId = await assertOwner(req, res, community.id);
  if (!ownerId) return;

  const [result] = await pool.query(
    `UPDATE community_memberships SET role = 'member' WHERE community_id = ? AND clerk_id = ? AND role = 'moderator'`,
    [community.id, req.params.clerkId]
  );
  if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Moderator not found');
  await logModAction(community.id, ownerId, 'remove_mod', { targetClerkId: req.params.clerkId });
  return success(res, { ok: true });
}));

// ── Mod log ───────────────────────────────────────────────────────────────────

router.get('/:slug/mod/log', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 30;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT ml.id, ml.action_type, ml.target_clerk_id, ml.target_post_id, ml.details, ml.created_at,
            COALESCE(pm.display_name, ml.mod_clerk_id)    AS mod_name,
            COALESCE(pt.display_name, ml.target_clerk_id) AS target_name,
            cp.title AS post_title
     FROM community_mod_log ml
     LEFT JOIN user_profiles pm ON pm.clerk_id = ml.mod_clerk_id
     LEFT JOIN user_profiles pt ON pt.clerk_id = ml.target_clerk_id
     LEFT JOIN community_posts cp ON cp.id = ml.target_post_id
     WHERE ml.community_id = ?
     ORDER BY ml.created_at DESC LIMIT ? OFFSET ?`,
    [community.id, limit, offset]
  );
  return success(res, { log: rows });
}));

// ── Allowlist ─────────────────────────────────────────────────────────────────

router.get('/:slug/mod/allowlist', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const mod = await assertMod(req, res, community.id);
  if (!mod) return;

  const [rows] = await pool.query(
    `SELECT al.clerk_id, al.added_at, p.display_name, p.avatar_url
     FROM community_post_allowlist al
     LEFT JOIN user_profiles p ON p.clerk_id = al.clerk_id
     WHERE al.community_id = ? ORDER BY al.added_at ASC`,
    [community.id]
  );

  const unresolved = rows.filter(r => !r.display_name);
  if (unresolved.length > 0) {
    try {
      const { data: clerkUsers } = await clerkClient.users.getUserList({
        userId: unresolved.map(r => r.clerk_id), limit: unresolved.length,
      });
      const clerkMap = new Map(clerkUsers.map(u => [u.id, u]));
      for (const row of rows) {
        if (!row.display_name) {
          const cu = clerkMap.get(row.clerk_id);
          row.display_name = cu
            ? ([cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || row.clerk_id)
            : row.clerk_id;
        }
      }
    } catch { rows.forEach(r => { if (!r.display_name) r.display_name = r.clerk_id; }); }
  }

  return success(res, { allowlist: rows });
}));

router.post('/:slug/mod/allowlist', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const ownerId = await assertOwner(req, res, community.id);
  if (!ownerId) return;

  const { clerk_id } = req.body;
  if (!clerk_id || typeof clerk_id !== 'string') return fail(res, ERRORS.MISSING_FIELD, 'clerk_id required');

  await pool.query(
    'INSERT IGNORE INTO community_post_allowlist (community_id, clerk_id) VALUES (?, ?)',
    [community.id, clerk_id.trim()]
  );
  return success(res, { ok: true });
}));

router.delete('/:slug/mod/allowlist/:clerkId', guard(async (req, res) => {
  const community = await getCommunityBySlug(req.params.slug);
  if (!community) return fail(res, ERRORS.NOT_FOUND, 'Community not found');
  const ownerId = await assertOwner(req, res, community.id);
  if (!ownerId) return;

  await pool.query(
    'DELETE FROM community_post_allowlist WHERE community_id = ? AND clerk_id = ?',
    [community.id, req.params.clerkId]
  );
  return success(res, { ok: true });
}));

export default router;
