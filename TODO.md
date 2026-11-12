# Project Task List (TODO.md)

## Completed Tasks
- [x] Google Maps JS API + Leaflet fallback & Places API (New) Text Search, Nearby Search, Details & Photo Proxy
- [x] Nearby Discovery, Hotels & Restaurants Panel (`src/components/NearbyDiscoveryPanel.tsx`)
- [x] Persistent SQLite Database (`src/db/database.ts` via `node:sqlite`)
- [x] User Authentication, Session Cookies/Bearer Tokens, Password Reset (`src/routes/authRoutes.ts`)
- [x] Smart Itinerary Editing, Undo Stack, Day Regeneration, Dynamic Rescheduler with Preview Diff, Route Order Optimizer (`src/routes/itineraryRoutes.ts`, `src/components/ItineraryBuilder.tsx`)
- [x] 11-Category Budget Manager, Currency Converter, AI Cost Optimizer (`src/routes/budgetGroupRoutes.ts`)
- [x] Group Trip Collaboration (Owner/Editor/Viewer roles, Share Codes) & Expense Splitting (Equal/Custom/Percentage + Debt Simplification + Settlements) (`src/components/BudgetGroupPanel.tsx`)
- [x] Private Travel Document Manager, Reminders, Emergency Numbers, Official Visa Links, Local Phrases (`src/routes/companionDocsRoutes.ts`, `src/components/TravelVaultPanel.tsx`)
- [x] Offline PWA Support (Service Worker `public/sw.js`, `public/manifest.json`, IndexedDB `src/utils/offlineStorage.ts`)
- [x] Automated Backend & API Integration Test Suite (`tests/app.test.ts`)
- [x] TypeScript Check (`npm run lint`) & Production Build (`npm run build`) Verified

## Remaining / External Requirements
- [ ] **Google Cloud Billing:** Enable billing on the Google Cloud project if you want Google Geocoding API & Google Geolocation API active instead of OSM Nominatim / IP fallbacks.
- [ ] **Gemini API Key:** Set `GEMINI_API_KEY` in `.env` for live Gemini 3.8 Flash responses (fallback advisor works without it).
- [ ] **Optional E2E Browser Suite:** Add Playwright E2E UI tests for full browser click-through verification.
