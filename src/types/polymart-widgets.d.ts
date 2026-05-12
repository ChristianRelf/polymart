import type { HTMLAttributes } from 'react'

type PolymartEl = HTMLAttributes<HTMLElement> & {
  ticker?: string
  chart?: string
  theme?: string
  interval?: string
  logo?: string
  by?: string
  dir?: string
  limit?: string
  title?: string
  speed?: string
  width?: string
  height?: string
  sector?: string
}

// Augment the JSX namespace used by react/jsx-runtime (React 17+ new transform)
declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'polymart-ticker': PolymartEl
      'polymart-market': PolymartEl
      'polymart-leaderboard': PolymartEl
      'polymart-tape': PolymartEl
      'polymart-sparkline': PolymartEl
      'polymart-sector': PolymartEl
      'polymart-events': PolymartEl
    }
  }
}
