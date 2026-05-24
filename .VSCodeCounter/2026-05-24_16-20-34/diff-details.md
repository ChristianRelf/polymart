# Diff Details

Date : 2026-05-24 16:20:34

Directory c:\\Users\\chris\\Documents\\GitHub\\polymart

Total : 45 files,  6265 codes, 353 comments, 569 blanks, all 7187 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [server/PolyAPI/AccountsAPI.js](/server/PolyAPI/AccountsAPI.js) | JavaScript | 94 | 7 | 21 | 122 |
| [server/PolyAPI/LeaderboardAPI.js](/server/PolyAPI/LeaderboardAPI.js) | JavaScript | 87 | 15 | 17 | 119 |
| [server/PolyAPI/MarketAPI.js](/server/PolyAPI/MarketAPI.js) | JavaScript | 193 | 3 | 11 | 207 |
| [server/PolyEngine/AssetResolver.js](/server/PolyEngine/AssetResolver.js) | JavaScript | 1 | 0 | 0 | 1 |
| [server/PolyEngine/CryptoData.js](/server/PolyEngine/CryptoData.js) | JavaScript | 296 | 73 | 49 | 418 |
| [server/PolyEngine/CryptoSimulation.js](/server/PolyEngine/CryptoSimulation.js) | JavaScript | 380 | 51 | 63 | 494 |
| [server/PolyEngine/DataAdapter.js](/server/PolyEngine/DataAdapter.js) | JavaScript | 85 | 1 | 6 | 92 |
| [server/PolyEngine/DataWrapper.js](/server/PolyEngine/DataWrapper.js) | JavaScript | 21 | 1 | 2 | 24 |
| [server/PolyEngine/OrderMatcher.js](/server/PolyEngine/OrderMatcher.js) | JavaScript | 89 | 27 | 15 | 131 |
| [server/PolyEngine/StockData.js](/server/PolyEngine/StockData.js) | JavaScript | 34 | 1 | 0 | 35 |
| [server/PolyEngine/StockSimulation.js](/server/PolyEngine/StockSimulation.js) | JavaScript | 5 | 0 | 0 | 5 |
| [server/PolyEngine/tick.js](/server/PolyEngine/tick.js) | JavaScript | 24 | 2 | 3 | 29 |
| [server/schema-market.sql](/server/schema-market.sql) | MS SQL | 67 | 2 | 3 | 72 |
| [server/schema-user.sql](/server/schema-user.sql) | MS SQL | 7 | 13 | 1 | 21 |
| [server/server.js](/server/server.js) | JavaScript | 43 | 6 | 3 | 52 |
| [src/App.tsx](/src/App.tsx) | TypeScript JSX | 19 | 0 | 0 | 19 |
| [src/components/trading/DrawingToolbar.tsx](/src/components/trading/DrawingToolbar.tsx) | TypeScript JSX | 314 | 13 | 33 | 360 |
| [src/components/trading/IndicatorsPanel.tsx](/src/components/trading/IndicatorsPanel.tsx) | TypeScript JSX | 201 | 7 | 16 | 224 |
| [src/components/trading/LayoutsDropdown.tsx](/src/components/trading/LayoutsDropdown.tsx) | TypeScript JSX | 137 | 3 | 9 | 149 |
| [src/components/trading/PanelGrid.tsx](/src/components/trading/PanelGrid.tsx) | TypeScript JSX | 115 | 3 | 12 | 130 |
| [src/components/trading/PanelLibrary.tsx](/src/components/trading/PanelLibrary.tsx) | TypeScript JSX | 107 | 7 | 11 | 125 |
| [src/components/trading/panels/CalendarPanel.tsx](/src/components/trading/panels/CalendarPanel.tsx) | TypeScript JSX | 46 | 1 | 3 | 50 |
| [src/components/trading/panels/DomLadderPanel.tsx](/src/components/trading/panels/DomLadderPanel.tsx) | TypeScript JSX | 63 | 3 | 7 | 73 |
| [src/components/trading/panels/HeatmapPanel.tsx](/src/components/trading/panels/HeatmapPanel.tsx) | TypeScript JSX | 50 | 0 | 6 | 56 |
| [src/components/trading/panels/NewsPanel.tsx](/src/components/trading/panels/NewsPanel.tsx) | TypeScript JSX | 49 | 0 | 5 | 54 |
| [src/components/trading/panels/OrderBookPanel.tsx](/src/components/trading/panels/OrderBookPanel.tsx) | TypeScript JSX | 65 | 4 | 12 | 81 |
| [src/components/trading/panels/ScannerPanel.tsx](/src/components/trading/panels/ScannerPanel.tsx) | TypeScript JSX | 83 | 3 | 8 | 94 |
| [src/components/trading/panels/TimeSalesPanel.tsx](/src/components/trading/panels/TimeSalesPanel.tsx) | TypeScript JSX | 49 | 0 | 8 | 57 |
| [src/components/trading/types.ts](/src/components/trading/types.ts) | TypeScript | 111 | 5 | 14 | 130 |
| [src/hooks/useAccount.ts](/src/hooks/useAccount.ts) | TypeScript | 33 | 0 | 5 | 38 |
| [src/lib/SimulationContext.tsx](/src/lib/SimulationContext.tsx) | TypeScript JSX | 88 | 1 | 5 | 94 |
| [src/lib/routes.ts](/src/lib/routes.ts) | TypeScript | -10 | 0 | 0 | -10 |
| [src/lib/trading/indicators.ts](/src/lib/trading/indicators.ts) | TypeScript | 223 | 3 | 20 | 246 |
| [src/lib/trading/layoutPresets.ts](/src/lib/trading/layoutPresets.ts) | TypeScript | 79 | 1 | 4 | 84 |
| [src/lib/trading/layoutStorage.ts](/src/lib/trading/layoutStorage.ts) | TypeScript | 44 | 0 | 8 | 52 |
| [src/pages/AccountPage.tsx](/src/pages/AccountPage.tsx) | TypeScript JSX | 31 | 1 | 4 | 36 |
| [src/pages/ApiDocsPage.tsx](/src/pages/ApiDocsPage.tsx) | TypeScript JSX | 206 | 4 | 6 | 216 |
| [src/pages/CommunityAdminPage.tsx](/src/pages/CommunityAdminPage.tsx) | TypeScript JSX | 2 | 0 | 0 | 2 |
| [src/pages/CryptoPage.tsx](/src/pages/CryptoPage.tsx) | TypeScript JSX | 728 | 31 | 60 | 819 |
| [src/pages/LeaderboardPage.tsx](/src/pages/LeaderboardPage.tsx) | TypeScript JSX | 204 | 11 | 28 | 243 |
| [src/pages/LegalHubPage.tsx](/src/pages/LegalHubPage.tsx) | TypeScript JSX | 102 | 4 | 9 | 115 |
| [src/pages/LegalPage.tsx](/src/pages/LegalPage.tsx) | TypeScript JSX | 25 | 0 | 0 | 25 |
| [src/pages/ProductsPage.tsx](/src/pages/ProductsPage.tsx) | TypeScript JSX | 3 | 0 | 0 | 3 |
| [src/pages/SponsorPage.tsx](/src/pages/SponsorPage.tsx) | TypeScript JSX | 73 | 3 | 2 | 78 |
| [src/pages/TradingTerminalPage.tsx](/src/pages/TradingTerminalPage.tsx) | TypeScript JSX | 1,599 | 43 | 80 | 1,722 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details