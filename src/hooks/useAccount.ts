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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
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
    }) =>
      withToken(t =>
        apiFetch(`/account/portfolios/${portfolioId}/orders`, t, { method: "POST", body: JSON.stringify(body) })
      ),
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
      return fetch(`${API}/community/posts?${qs}`).then(r => r.json())
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

  const getComments = useCallback(
    (postId: number) => fetch(`${API}/community/posts/${postId}/comments`).then(r => r.json()),
    []
  )

  const createComment = useCallback(
    (postId: number, body: string) =>
      withToken(t => apiFetch(`/community/posts/${postId}/comments`, t, { method: "POST", body: JSON.stringify({ body }) })),
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

  return {
    getMe,
    updateMe,
    getPortfolios,
    createPortfolio,
    getPortfolio,
    updatePortfolio,
    deletePortfolio,
    placeOrder,
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
    getComments,
    createComment,
    deleteComment,
    reportPost,
  }
}
