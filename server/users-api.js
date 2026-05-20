import { Router } from 'express';
import { dbUser as pool } from './db.js';

const STAFF_EMAIL = 'christianjamesrelf@gmail.com';

const router = Router();

// ── GET /users/profile/:profileId ─────────────────────────────────────────────
// Public - no auth required. Returns sanitized profile + recent posts.
router.get('/profile/:profileId', async (req, res) => {
  const { profileId } = req.params;
  if (!/^\d{16}$/.test(profileId)) {
    return res.status(400).json({ error: 'Invalid profile ID' });
  }

  try {
    const [[user]] = await pool.query(
      `SELECT profile_id, display_name, avatar_url, bio,
              COALESCE(is_verified, 0) AS is_verified,
              (email = ?) AS is_staff,
              created_at
       FROM user_profiles
       WHERE profile_id = ?`,
      [STAFF_EMAIL, profileId]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Recent posts (public, non-removed only)
    const [posts] = await pool.query(
      `SELECT cp.id, cp.share_id, cp.title, cp.post_type, cp.likes, cp.created_at,
              COALESCE(cp.display_name, up.display_name) AS display_name,
              c.slug AS community_slug, c.display_name AS community_display_name,
              COUNT(cc.id) AS comment_count
       FROM community_posts cp
       LEFT JOIN communities c ON c.id = cp.community_id
       LEFT JOIN community_comments cc ON cc.post_id = cp.id
       LEFT JOIN user_profiles up ON up.clerk_id = cp.clerk_id
       WHERE cp.clerk_id = (SELECT clerk_id FROM user_profiles WHERE profile_id = ?)
         AND cp.is_removed = 0
       GROUP BY cp.id
       ORDER BY cp.created_at DESC
       LIMIT 20`,
      [profileId]
    );

    res.json({
      ...user,
      is_staff: !!user.is_staff,
      is_verified: !!user.is_verified,
      posts,
    });
  } catch (err) {
    console.error('[users-api] GET /profile/:profileId:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
