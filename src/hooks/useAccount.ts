import { useCallback } from "react"
import { useAuth } from "@clerk/clerk-react"

const API = "/api/v1"

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  })
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    throw new Error(`API error ${res.status}: server returned non-JSON response for ${path}`)
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || json.error || `Request failed: ${res.status}`)
  return json.data ?? json
}

async function unwrapJson(res: Response) {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || json.error || `Error ${res.status}`)
  return json.data ?? json
}

export function useAccount() {
  const { getToken } = useAuth()

  const withToken = useCallback(async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    let token = await getToken()
    if (!token) {
      // Clerk sometimes needs one tick after a fresh sign-in to issue the token.
      await new Promise(r => setTimeout(r, 300))
      token = await getToken()
    }
    if (!token) throw new Error("Not authenticated")
    return fn(token)
  }, [getToken])

  const getMe = useCallback(
    () => withToken(t => apiFetch("/account/me", t)),
    [withToken]
  )

  const updateMe = useCallback(
    (body: { display_name?: string; bio?: string }) =>
      withToken(t => apiFetch("/account/me", t, { method: "PUT", body: JSON.stringify(body) })),
    [withToken]
  )

  const getPortfolios = useCallback(
    () => withToken(t => apiFetch("/account/portfolios", t)),
    [withToken]
  )

  const createPortfolio = useCallback(
    (body: { name: string; description?: string }) =>
      withToken(t => apiFetch("/account/portfolios", t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const getPortfolio = useCallback(
    (id: number) => withToken(t => apiFetch(`/account/portfolios/${id}`, t)),
    [withToken]
  )

  const updatePortfolio = useCallback(
    (id: number, body: { name?: string; description?: string }) =>
      withToken(t => apiFetch(`/account/portfolios/${id}`, t, { method: "PUT", body: JSON.stringify(body) })),
    [withToken]
  )

  const deletePortfolio = useCallback(
    (id: number) => withToken(t => apiFetch(`/account/portfolios/${id}`, t, { method: "DELETE" })),
    [withToken]
  )

  const placeOrder = useCallback(
    (portfolioId: number, body: {
      asset_type: string
      symbol: string
      side: "buy" | "sell"
      quantity: number
      notes?: string
      order_type?: "market" | "limit" | "stop"
      trigger_price?: number
    }) =>
      withToken(t =>
        apiFetch(`/account/portfolios/${portfolioId}/orders`, t, { method: "POST", body: JSON.stringify(body) })
      ),
    [withToken]
  )

  const cancelOrder = useCallback(
    (portfolioId: number, orderId: number) =>
      withToken(t =>
        apiFetch(`/account/portfolios/${portfolioId}/orders/${orderId}`, t, { method: "DELETE" })
      ),
    [withToken]
  )

  const getPendingOrders = useCallback(
    (portfolioId: number) =>
      withToken(t => apiFetch(`/account/portfolios/${portfolioId}/orders/pending`, t)),
    [withToken]
  )

  const getOrders = useCallback(
    (portfolioId: number, params?: { page?: number; asset_type?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set("page", String(params.page))
      if (params?.asset_type) qs.set("asset_type", params.asset_type)
      return withToken(t => apiFetch(`/account/portfolios/${portfolioId}/orders?${qs}`, t))
    },
    [withToken]
  )

  const getWatchlists = useCallback(
    () => withToken(t => apiFetch("/account/watchlists", t)),
    [withToken]
  )

  const addWatchlistItem = useCallback(
    (watchlistId: number, asset_type: string, symbol: string) =>
      withToken(t =>
        apiFetch(`/account/watchlists/${watchlistId}/items`, t, {
          method: "POST",
          body: JSON.stringify({ asset_type, symbol }),
        })
      ),
    [withToken]
  )

  const removeWatchlistItem = useCallback(
    (watchlistId: number, asset_type: string, symbol: string) =>
      withToken(t =>
        apiFetch(`/account/watchlists/${watchlistId}/items`, t, {
          method: "DELETE",
          body: JSON.stringify({ asset_type, symbol }),
        })
      ),
    [withToken]
  )

  const getBilling = useCallback(
    () => withToken(t => apiFetch("/billing", t)),
    [withToken]
  )

  const startCheckout = useCallback(
    () => withToken(t => apiFetch("/billing/checkout", t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const submitSupportTicket = useCallback(
    (body: { subject: string; message: string }) =>
      withToken(t => apiFetch("/support/ticket", t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const getPortfolioSnapshots = useCallback(
    (id: number) => withToken(t => apiFetch(`/account/portfolios/${id}/snapshots`, t)),
    [withToken]
  )

  const getStats = useCallback(
    () => withToken(t => apiFetch("/account/stats", t)),
    [withToken]
  )

  const getRecentOrders = useCallback(
    () => withToken(t => apiFetch("/account/orders/recent", t)),
    [withToken]
  )

  const getSupportTickets = useCallback(
    () => withToken(t => apiFetch("/support/tickets", t)),
    [withToken]
  )

  const getCommunityPosts = useCallback(
    (params?: { page?: number; type?: string; sort?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page) qs.set("page", String(params.page))
      if (params?.type) qs.set("type", params.type)
      if (params?.sort) qs.set("sort", params.sort)
      return fetch(`${API}/community/posts?${qs}`).then(unwrapJson)
    },
    []
  )

  const createCommunityPost = useCallback(
    (body: { title: string; body: string; post_type: string }) =>
      withToken(t => apiFetch("/community/posts", t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const likePost = useCallback(
    (id: number) => withToken(t => apiFetch(`/community/posts/${id}/like`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const deletePost = useCallback(
    (id: number) => withToken(t => apiFetch(`/community/posts/${id}`, t, { method: "DELETE" })),
    [withToken]
  )

  const updatePost = useCallback(
    (id: number, data: { title?: string; body?: string; post_type?: string }) =>
      withToken(t => apiFetch(`/community/posts/${id}`, t, { method: "PUT", body: JSON.stringify(data) })),
    [withToken]
  )

  const getPostByShareId = useCallback(
    (shareId: string) =>
      fetch(`${API}/community/posts/share/${shareId}`).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(r.status === 404 ? "not_found" : json.error?.message || json.error || `Error ${r.status}`)
        return json.data ?? json
      }),
    []
  )

  const getComments = useCallback(
    (postId: number) => fetch(`${API}/community/posts/${postId}/comments`).then(unwrapJson),
    []
  )

  const createComment = useCallback(
    (postId: number, body: string, parentId: number | null = null) =>
      withToken(t => apiFetch(`/community/posts/${postId}/comments`, t, {
        method: "POST",
        body: JSON.stringify({ body, parent_id: parentId }),
      })),
    [withToken]
  )

  const deleteComment = useCallback(
    (id: number) => withToken(t => apiFetch(`/community/comments/${id}`, t, { method: "DELETE" })),
    [withToken]
  )

  const reportPost = useCallback(
    (postId: number, reason: string) =>
      withToken(t => apiFetch(`/community/posts/${postId}/report`, t, { method: "POST", body: JSON.stringify({ reason }) })),
    [withToken]
  )

  const uploadCommunityImage = useCallback(
    (file: File) =>
      withToken(async t => {
        const form = new FormData()
        form.append("image", file)
        const res = await fetch(`${API}/community/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: form,
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message || json.error || "Upload failed")
        return (json.data ?? json).url as string
      }),
    [withToken]
  )

  // ── Sub-communities ─────────────────────────────────────────────────────────

  const getCommunities = useCallback(
    (params?: { q?: string; sort?: string; page?: number }) => {
      const qs = new URLSearchParams()
      if (params?.q)    qs.set("q",    params.q)
      if (params?.sort) qs.set("sort", params.sort)
      if (params?.page) qs.set("page", String(params.page))
      return fetch(`${API}/communities?${qs}`).then(unwrapJson)
    },
    []
  )

  const getMyJoinedCommunities = useCallback(
    () => withToken(t => apiFetch("/communities/mine", t)),
    [withToken]
  )

  const getCommunity = useCallback(
    (slug: string) =>
      fetch(`${API}/communities/${slug}`).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message || json.error || `Error ${r.status}`)
        return json.data ?? json
      }),
    []
  )

  const createCommunity = useCallback(
    (body: { slug: string; display_name: string; description?: string }) =>
      withToken(t => apiFetch("/communities", t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const updateCommunity = useCallback(
    (slug: string, body: {
      display_name?: string
      description?: string
      post_permission?: "everyone" | "members" | "chosen"
      post_tags?: { key: string; label: string; color: string }[] | null
    }) =>
      withToken(t => apiFetch(`/communities/${slug}`, t, { method: "PUT", body: JSON.stringify(body) })),
    [withToken]
  )

  const deleteCommunity = useCallback(
    (slug: string) => withToken(t => apiFetch(`/communities/${slug}`, t, { method: "DELETE" })),
    [withToken]
  )

  const reportCommunity = useCallback(
    (slug: string, reason: string) =>
      withToken(t => apiFetch(`/communities/${slug}/report`, t, { method: "POST", body: JSON.stringify({ reason }) })),
    [withToken]
  )

  const joinCommunity = useCallback(
    (slug: string) => withToken(t => apiFetch(`/communities/${slug}/join`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const leaveCommunity = useCallback(
    (slug: string) => withToken(t => apiFetch(`/communities/${slug}/leave`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const getCommunityMembers = useCallback(
    (slug: string, page = 1) =>
      fetch(`${API}/communities/${slug}/members?page=${page}`).then(unwrapJson),
    []
  )

  const getCommunityPostsBySlug = useCallback(
    (slug: string, params?: { page?: number; sort?: string }) => {
      const qs = new URLSearchParams({ community: slug })
      if (params?.page) qs.set("page", String(params.page))
      if (params?.sort) qs.set("sort", params.sort ?? "new")
      return fetch(`${API}/community/posts?${qs}`).then(unwrapJson)
    },
    []
  )

  const getCommunityRules = useCallback(
    (slug: string) => fetch(`${API}/communities/${slug}/rules`).then(unwrapJson),
    []
  )

  const createCommunityRule = useCallback(
    (slug: string, body: { title: string; description?: string }) =>
      withToken(t => apiFetch(`/communities/${slug}/rules`, t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const updateCommunityRule = useCallback(
    (slug: string, ruleId: number, body: { title?: string; description?: string }) =>
      withToken(t => apiFetch(`/communities/${slug}/rules/${ruleId}`, t, { method: "PUT", body: JSON.stringify(body) })),
    [withToken]
  )

  const deleteCommunityRule = useCallback(
    (slug: string, ruleId: number) =>
      withToken(t => apiFetch(`/communities/${slug}/rules/${ruleId}`, t, { method: "DELETE" })),
    [withToken]
  )

  const getModQueue = useCallback(
    (slug: string, page = 1) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/queue?page=${page}`, t)),
    [withToken]
  )

  const pinPost = useCallback(
    (slug: string, postId: number) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/pin/${postId}`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const unpinPost = useCallback(
    (slug: string, postId: number) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/unpin/${postId}`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const removePost = useCallback(
    (slug: string, postId: number, reason?: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/remove/${postId}`, t, { method: "POST", body: JSON.stringify({ reason }) })),
    [withToken]
  )

  const restorePost = useCallback(
    (slug: string, postId: number) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/restore/${postId}`, t, { method: "POST", body: "{}" })),
    [withToken]
  )

  const banUser = useCallback(
    (slug: string, clerk_id: string, reason?: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/bans`, t, { method: "POST", body: JSON.stringify({ clerk_id, reason }) })),
    [withToken]
  )

  const unbanUser = useCallback(
    (slug: string, clerkId: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/bans/${clerkId}`, t, { method: "DELETE" })),
    [withToken]
  )

  const getCommunityBans = useCallback(
    (slug: string) => withToken(t => apiFetch(`/communities/${slug}/mod/bans`, t)),
    [withToken]
  )

  const addModerator = useCallback(
    (slug: string, clerk_id: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/moderators`, t, { method: "POST", body: JSON.stringify({ clerk_id }) })),
    [withToken]
  )

  const removeModerator = useCallback(
    (slug: string, clerkId: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/moderators/${clerkId}`, t, { method: "DELETE" })),
    [withToken]
  )

  const getModLog = useCallback(
    (slug: string, page = 1) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/log?page=${page}`, t)),
    [withToken]
  )

  const uploadCommunityIcon = useCallback(
    (slug: string, file: File) =>
      withToken(async t => {
        const form = new FormData()
        form.append("image", file)
        const res = await fetch(`${API}/communities/${slug}/upload/icon`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: form,
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message || json.error || "Upload failed")
        return (json.data ?? json).url as string
      }),
    [withToken]
  )

  const uploadCommunityBanner = useCallback(
    (slug: string, file: File) =>
      withToken(async t => {
        const form = new FormData()
        form.append("image", file)
        const res = await fetch(`${API}/communities/${slug}/upload/banner`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: form,
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message || json.error || "Upload failed")
        return (json.data ?? json).url as string
      }),
    [withToken]
  )

  const getMyReports = useCallback(
    () => withToken(t => apiFetch("/community/my-reports", t)),
    [withToken]
  )

  const getModActionsAgainstMe = useCallback(
    () => withToken(t => apiFetch("/communities/my-mod-history", t)),
    [withToken]
  )

  const createCommunityPostScoped = useCallback(
    (body: { title: string; body: string; post_type: string; community_id: number }) =>
      withToken(t => apiFetch("/community/posts", t, { method: "POST", body: JSON.stringify(body) })),
    [withToken]
  )

  const getAllowlist = useCallback(
    (slug: string) => withToken(t => apiFetch(`/communities/${slug}/mod/allowlist`, t)),
    [withToken]
  )

  const addToAllowlist = useCallback(
    (slug: string, clerk_id: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/allowlist`, t, { method: "POST", body: JSON.stringify({ clerk_id }) })),
    [withToken]
  )

  const removeFromAllowlist = useCallback(
    (slug: string, clerkId: string) =>
      withToken(t => apiFetch(`/communities/${slug}/mod/allowlist/${clerkId}`, t, { method: "DELETE" })),
    [withToken]
  )

  const verifyUser = useCallback(
    (clerkId: string, is_verified: boolean) =>
      withToken(t => apiFetch(`/admin/users/${clerkId}/verify`, t, { method: "PUT", body: JSON.stringify({ is_verified }) })),
    [withToken]
  )

  const getPublicProfile = useCallback(
    (profileId: string) => fetch(`${API}/users/profile/${profileId}`).then(unwrapJson),
    []
  )

  return {
    getMe,
    updateMe,
    getPortfolios,
    createPortfolio,
    getPortfolio,
    updatePortfolio,
    deletePortfolio,
    placeOrder,
    cancelOrder,
    getPendingOrders,
    getOrders,
    getWatchlists,
    addWatchlistItem,
    removeWatchlistItem,
    getBilling,
    startCheckout,
    submitSupportTicket,
    getPortfolioSnapshots,
    getStats,
    getRecentOrders,
    getSupportTickets,
    getCommunityPosts,
    createCommunityPost,
    likePost,
    deletePost,
    updatePost,
    getPostByShareId,
    getComments,
    createComment,
    deleteComment,
    reportPost,
    uploadCommunityImage,
    getCommunities,
    getMyJoinedCommunities,
    getCommunity,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    reportCommunity,
    joinCommunity,
    leaveCommunity,
    getCommunityMembers,
    getCommunityPostsBySlug,
    getCommunityRules,
    createCommunityRule,
    updateCommunityRule,
    deleteCommunityRule,
    getModQueue,
    pinPost,
    unpinPost,
    removePost,
    restorePost,
    banUser,
    unbanUser,
    getCommunityBans,
    addModerator,
    removeModerator,
    getModLog,
    uploadCommunityIcon,
    uploadCommunityBanner,
    getMyReports,
    getModActionsAgainstMe,
    createCommunityPostScoped,
    getAllowlist,
    addToAllowlist,
    removeFromAllowlist,
    verifyUser,
    getPublicProfile,
  }
}
