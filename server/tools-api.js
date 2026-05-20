import { Router }    from 'express';
import { getAuth }   from '@clerk/express';
import { dbUser as pool } from './db.js';

const router = Router();

const VALID_CATEGORIES = new Set([
  'Charting', 'Screener', 'Backtester', 'Portfolio Tracker',
  'News Aggregator', 'API / Data', 'Discord Bot', 'Education', 'Other',
]);

// Ensure the tools table exists on startup (idempotent).
pool.query(`
  CREATE TABLE IF NOT EXISTS community_tools (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(128) NOT NULL,
    description  VARCHAR(500) NOT NULL,
    url          VARCHAR(512) NOT NULL,
    category     VARCHAR(64)  NOT NULL DEFAULT 'Other',
    author_clerk_id VARCHAR(64) NOT NULL,
    author_name  VARCHAR(128) NOT NULL DEFAULT '',
    upvotes      INT          NOT NULL DEFAULT 0,
    approved     TINYINT      NOT NULL DEFAULT 0,
    created_at   DATETIME(3)  NOT NULL DEFAULT NOW(3),
    INDEX idx_category (category),
    INDEX idx_approved (approved)
  )
`).catch(err => console.error('[tools-api] table init error:', err.message));

// ── GET /tools ────────────────────────────────────────────────────────────────
// Public. Returns approved tools, optionally filtered by category.
router.get('/', async (req, res) => {
  const category = req.query.category?.trim() || '';
  try {
    const conditions = ['approved = 1'];
    const params = [];
    if (category && VALID_CATEGORIES.has(category)) {
      conditions.push('category = ?');
      params.push(category);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [rows] = await pool.query(
      `SELECT id, name, description, url, category, author_name, upvotes, created_at
       FROM community_tools ${where}
       ORDER BY upvotes DESC, created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ tools: rows });
  } catch (err) {
    console.error('[tools-api] GET /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /tools ───────────────────────────────────────────────────────────────
// Auth required. Submits a tool for review (approved = 0 by default).
router.post('/', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { name, description, url, category = 'Other' } = req.body;

  if (!name || typeof name !== 'string' || !name.trim() || name.length > 128)
    return res.status(400).json({ error: 'name is required and must be under 128 characters' });
  if (!description || typeof description !== 'string' || !description.trim() || description.length > 500)
    return res.status(400).json({ error: 'description is required and must be under 500 characters' });
  if (!url || typeof url !== 'string' || !/^https?:\/\/.+/.test(url.trim()) || url.length > 512)
    return res.status(400).json({ error: 'A valid URL starting with http:// or https:// is required' });
  if (!VALID_CATEGORIES.has(category))
    return res.status(400).json({ error: 'Invalid category' });

  try {
    // Prevent duplicate submissions from the same user for the same URL.
    const [[existing]] = await pool.query(
      'SELECT id FROM community_tools WHERE url = ? AND author_clerk_id = ?',
      [url.trim(), userId]
    );
    if (existing) return res.status(409).json({ error: 'You have already submitted a tool with this URL' });

    const [[profile]] = await pool.query(
      'SELECT display_name FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );
    const authorName = profile?.display_name || 'Anonymous';

    await pool.query(
      `INSERT INTO community_tools (name, description, url, category, author_clerk_id, author_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), description.trim(), url.trim(), category, userId, authorName]
    );

    res.status(201).json({ message: 'Tool submitted for review. It will appear once approved.' });
  } catch (err) {
    console.error('[tools-api] POST /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /tools/:id/upvote ────────────────────────────────────────────────────
// Auth required. One upvote per user per tool (enforced via unique constraint if table has it,
// otherwise in-memory check for simplicity).
router.post('/:id/upvote', async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const toolId = parseInt(req.params.id);
  if (!toolId) return res.status(400).json({ error: 'Invalid tool id' });

  try {
    const [[tool]] = await pool.query(
      'SELECT id, approved FROM community_tools WHERE id = ?', [toolId]
    );
    if (!tool || !tool.approved)
      return res.status(404).json({ error: 'Tool not found' });

    // Use a separate upvotes table to deduplicate (create lazily).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_tool_upvotes (
        tool_id      INT        NOT NULL,
        clerk_id     VARCHAR(64) NOT NULL,
        created_at   DATETIME(3) NOT NULL DEFAULT NOW(3),
        PRIMARY KEY (tool_id, clerk_id)
      )
    `);

    const [[already]] = await pool.query(
      'SELECT tool_id FROM community_tool_upvotes WHERE tool_id = ? AND clerk_id = ?',
      [toolId, userId]
    );
    if (already) return res.status(409).json({ error: 'Already upvoted' });

    await pool.query(
      'INSERT INTO community_tool_upvotes (tool_id, clerk_id) VALUES (?, ?)', [toolId, userId]
    );
    await pool.query(
      'UPDATE community_tools SET upvotes = upvotes + 1 WHERE id = ?', [toolId]
    );

    res.json({ message: 'Upvoted' });
  } catch (err) {
    console.error('[tools-api] POST /:id/upvote:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin: GET /tools/pending ─────────────────────────────────────────────────
// Admin-only. Returns tools awaiting approval.
router.get('/pending', async (req, res) => {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId || sessionClaims?.publicMetadata?.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, url, category, author_name, author_clerk_id, created_at
       FROM community_tools WHERE approved = 0
       ORDER BY created_at ASC LIMIT 100`
    );
    res.json({ tools: rows });
  } catch (err) {
    console.error('[tools-api] GET /pending:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin: POST /tools/:id/approve ───────────────────────────────────────────
router.post('/:id/approve', async (req, res) => {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId || sessionClaims?.publicMetadata?.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  const toolId = parseInt(req.params.id);
  if (!toolId) return res.status(400).json({ error: 'Invalid tool id' });

  try {
    await pool.query('UPDATE community_tools SET approved = 1 WHERE id = ?', [toolId]);
    res.json({ message: 'Approved' });
  } catch (err) {
    console.error('[tools-api] POST /:id/approve:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin: DELETE /tools/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId || sessionClaims?.publicMetadata?.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  const toolId = parseInt(req.params.id);
  if (!toolId) return res.status(400).json({ error: 'Invalid tool id' });

  try {
    await pool.query('DELETE FROM community_tools WHERE id = ?', [toolId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[tools-api] DELETE /:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
