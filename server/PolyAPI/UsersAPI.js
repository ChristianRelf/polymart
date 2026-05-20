/**
 * PolyAPI · UsersAPI
 *
 * Public user profile routes. No authentication required.
 *
 * Mount point: /api/v1/users
 */

import { dbUser as pool } from '../db.js';
import { createRouter } from './Router.js';
import { success, fail, guard, ERRORS } from './Protocol.js';

const STAFF_EMAIL = 'christianjamesrelf@gmail.com';

const router = createRouter({ label: '[users-api]' });

// ── GET /users/profile/:profileId ─────────────────────────────────────────────

router.get('/profile/:profileId', guard(async (req, res) => {
  const { profileId } = req.params;
  if (!/^\d{16}$/.test(profileId))
    return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid profile ID');

  const [[user]] = await pool.query(
    `SELECT profile_id, display_name, avatar_url, bio,
            COALESCE(is_verified, 0) AS is_verified,
            (email = ?) AS is_staff,
            created_at
     FROM user_profiles WHERE profile_id = ?`,
    [STAFF_EMAIL, profileId]
  );
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');

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
     ORDER BY cp.created_at DESC LIMIT 20`,
    [profileId]
  );

  return success(res, {
    ...user,
    is_staff:    !!user.is_staff,
    is_verified: !!user.is_verified,
    posts,
  });
}));

export default router;
