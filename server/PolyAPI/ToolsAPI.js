/**
 * PolyAPI · ToolsAPI
 *
 * Community tools directory. Approved tools are public; submission requires
 * authentication; admin routes require the admin role.
 *
 * Mount point: /api/v1/tools
 */

import { dbUser as pool } from '../db.js';
import { createRouter } from './Router.js';
import { requireAuth, requireAdmin, rateLimit } from './Middleware.js';
import { success, fail, guard, ERRORS } from './Protocol.js';
import { schema, v } from './Validator.js';

const VALID_CATEGORIES = [
  'Charting', 'Screener', 'Backtester', 'Portfolio Tracker',
  'News Aggregator', 'API / Data', 'Discord Bot', 'Education', 'Other',
];
const CATEGORY_SET = new Set(VALID_CATEGORIES);

// ── Table bootstrap ───────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS community_tools (
    id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(128) NOT NULL,
    description      VARCHAR(500) NOT NULL,
    url              VARCHAR(512) NOT NULL,
    category         VARCHAR(64)  NOT NULL DEFAULT 'Other',
    author_clerk_id  VARCHAR(64)  NOT NULL,
    author_name      VARCHAR(128) NOT NULL DEFAULT '',
    upvotes          INT          NOT NULL DEFAULT 0,
    approved         TINYINT      NOT NULL DEFAULT 0,
    created_at       DATETIME(3)  NOT NULL DEFAULT NOW(3),
    INDEX idx_category (category),
    INDEX idx_approved (approved)
  )
`).catch(err => console.error('[tools-api] tools table init error:', err.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS community_tool_upvotes (
    tool_id    INT         NOT NULL,
    clerk_id   VARCHAR(64) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT NOW(3),
    PRIMARY KEY (tool_id, clerk_id)
  )
`).catch(err => console.error('[tools-api] upvotes table init error:', err.message));

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[tools-api]' });

// ── GET /tools ────────────────────────────────────────────────────────────────

router.get('/', guard(async (req, res) => {
  const category = (req.query.category || '').trim();

  const conditions = ['approved = 1'];
  const params = [];
  if (category && CATEGORY_SET.has(category)) {
    conditions.push('category = ?');
    params.push(category);
  }

  const [rows] = await pool.query(
    `SELECT id, name, description, url, category, author_name, upvotes, created_at
     FROM community_tools
     WHERE ${conditions.join(' AND ')}
     ORDER BY upvotes DESC, created_at DESC
     LIMIT 200`,
    params
  );
  return success(res, { tools: rows, categories: VALID_CATEGORIES });
}));

// ── POST /tools ───────────────────────────────────────────────────────────────

const submitSchema = schema({
  name:        v.string({ required: true, min: 1, max: 128, label: 'name' }),
  description: v.string({ required: true, min: 1, max: 500, label: 'description' }),
  url:         v.url({ required: true, max: 512, label: 'url' }),
  category:    v.optional(v.enum(VALID_CATEGORIES, { label: 'category' })),
});

router.post('/',
  requireAuth(),
  rateLimit({ windowMs: 3_600_000, max: 5, label: 'tools-submit' }),
  guard(async (req, res) => {
    const err = submitSchema.first(req.body);
    if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

    const { name, description, url, category = 'Other' } = req.body;

    const [[existing]] = await pool.query(
      'SELECT id FROM community_tools WHERE url = ? AND author_clerk_id = ?',
      [url.trim(), req.userId]
    );
    if (existing) return fail(res, ERRORS.CONFLICT, 'You have already submitted a tool with this URL');

    const [[profile]] = await pool.query(
      'SELECT display_name FROM user_profiles WHERE clerk_id = ?',
      [req.userId]
    );
    const authorName = profile?.display_name || 'Anonymous';

    await pool.query(
      `INSERT INTO community_tools (name, description, url, category, author_clerk_id, author_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), description.trim(), url.trim(), category, req.userId, authorName]
    );

    return success(res,
      { message: 'Tool submitted for review. It will appear once approved.' },
      undefined,
      201
    );
  })
);

// ── POST /tools/:id/upvote ────────────────────────────────────────────────────

router.post('/:id/upvote',
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 20, label: 'tools-upvote' }),
  guard(async (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (!toolId || toolId < 1) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid tool id');

    const [[tool]] = await pool.query(
      'SELECT id FROM community_tools WHERE id = ? AND approved = 1',
      [toolId]
    );
    if (!tool) return fail(res, ERRORS.NOT_FOUND, 'Tool not found');

    const [[already]] = await pool.query(
      'SELECT tool_id FROM community_tool_upvotes WHERE tool_id = ? AND clerk_id = ?',
      [toolId, req.userId]
    );
    if (already) return fail(res, ERRORS.CONFLICT, 'Already upvoted');

    await pool.query(
      'INSERT INTO community_tool_upvotes (tool_id, clerk_id) VALUES (?, ?)',
      [toolId, req.userId]
    );
    await pool.query(
      'UPDATE community_tools SET upvotes = upvotes + 1 WHERE id = ?',
      [toolId]
    );

    return success(res, { ok: true });
  })
);

// ── Admin: GET /tools/pending ─────────────────────────────────────────────────

router.get('/pending',
  requireAdmin(),
  guard(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id, name, description, url, category, author_name, author_clerk_id, created_at
       FROM community_tools WHERE approved = 0
       ORDER BY created_at ASC LIMIT 100`
    );
    return success(res, { tools: rows });
  })
);

// ── Admin: POST /tools/:id/approve ───────────────────────────────────────────

router.post('/:id/approve',
  requireAdmin(),
  guard(async (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (!toolId || toolId < 1) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid tool id');

    const [result] = await pool.query(
      'UPDATE community_tools SET approved = 1 WHERE id = ?',
      [toolId]
    );
    if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Tool not found');

    return success(res, { ok: true });
  })
);

// ── Admin: DELETE /tools/:id ──────────────────────────────────────────────────

router.delete('/:id',
  requireAdmin(),
  guard(async (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (!toolId || toolId < 1) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid tool id');

    const [result] = await pool.query(
      'DELETE FROM community_tools WHERE id = ?',
      [toolId]
    );
    if (result.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Tool not found');

    await pool.query('DELETE FROM community_tool_upvotes WHERE tool_id = ?', [toolId]);

    return success(res, { ok: true });
  })
);

export default router;
