// Edit this file to change what each subscription tier gets.
// Changes take effect immediately on the running server (no restart needed with --watch).
//
// assets: keys must match asset_type values used in orders/positions.
//         true = tier can trade this asset class; false = blocked (upgrade prompt shown).
//         Add new product keys here when they launch — no schema changes needed.

const TIER_CONFIG = {
  basic: {
    label: 'Basic',
    startingCash: 10000,
    maxPortfolios: 1,
    maxPositions: 10,       // open positions per portfolio (all asset types combined)
    maxWatchlists: 1,
    maxWatchlistItems: 20,
    assets: {
      stock: true,
      forex: false,
      // crypto: false,
    },
    canAccessLeaderboard: true,
    canExportHistory: false,
  },

  premium: {
    label: 'Premium',
    startingCash: 100000,
    maxPortfolios: 5,
    maxPositions: 100,
    maxWatchlists: 10,
    maxWatchlistItems: 200,
    assets: {
      stock: true,
      forex: true,
      // crypto: true,
    },
    canAccessLeaderboard: true,
    canExportHistory: true,
  },
};

export default TIER_CONFIG;
