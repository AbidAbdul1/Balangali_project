# AI-TravelMate — Worldwide AI Travel Planning & Companion Studio

AI-TravelMate is a full-stack React 19, Vite 8, TypeScript, Tailwind CSS v4, Express, and SQLite (`node:sqlite`) travel planning platform integrating Google Maps Platform, Open-Meteo weather, OSRM routing, and Google GenAI.

## Setup & Commands

1. Copy `.env.example` to `.env` and configure:
   - `VITE_GOOGLE_MAPS_API_KEY` (Maps JavaScript API)
   - `GOOGLE_MAPS_API_KEY` (Places API New, Geocoding, Geolocation)
   - `GEMINI_API_KEY` (optional, for Gemini AI advisor)
2. Install dependencies: `npm install`
3. Start development server: `npm run dev` (runs on `http://localhost:3000`)
4. TypeScript check: `npm run lint`
5. Run automated tests: `npm test`
6. Production build: `npm run build`

See `docs/API.md` for all backend API endpoints.

