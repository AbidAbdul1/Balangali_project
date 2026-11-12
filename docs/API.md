# AI-TravelMate Backend API Reference

## Google Maps, Geocoding & Places
- `GET /api/geocode?address=...` — Forward geocoding (Google Geocoding API with OSM Nominatim fallback)
- `GET /api/geocode/reverse?lat=...&lng=...` — Reverse geocoding
- `POST /api/geocode/google-locate` — Google Geolocation API
- `GET /api/geocode/ip` — Server-side IP geolocation fallback
- `GET /api/places/search?q=...&category=...&pageToken=...` — Places API (New) Text Search
- `GET /api/places/nearby?lat=...&lng=...&types=...&radius=...&minRating=...&openNow=...` — Places API (New) Nearby Search
- `GET /api/places/details/:placeId` — Place Details (New)
- `GET /api/places/photo?name=...` — Secure Place Photo proxy
- `POST /api/routes/optimize-order` — Multi-stop attraction order optimizer

## Itineraries, Regeneration & Rescheduling
- `POST /api/itineraries/generate` — Generate day-by-day itinerary
- `POST /api/itineraries/regenerate` — Regenerate a single day or replace an attraction while preserving confirmed bookings
- `POST /api/itineraries/reschedule` — Dynamic Trip Rescheduler returning a preview diff
- `GET /api/saved-trips`, `POST /api/saved-trips`, `POST /api/saved-trips/:id/duplicate`, `DELETE /api/saved-trips/:id`

## Budget, Cost Optimizer, Group Trips & Expense Splitting
- `GET /api/currency/rates` — Exchange rates with conversion date
- `POST /api/budget/optimize` — Cost/time/comfort optimization estimates
- `GET /api/trips/:tripId/expenses`, `POST /api/trips/:tripId/expenses`, `DELETE /api/trips/:tripId/expenses/:expenseId`
- `GET /api/trips/:tripId/balances`, `POST /api/trips/:tripId/settlements`
- `GET /api/trips/:tripId/members`, `POST /api/trips/:tripId/members`, `PATCH /api/trips/:tripId/members/:memberId`, `DELETE /api/trips/:tripId/members/:memberId`
- `POST /api/trips/join/:shareCode`

## Auth, Documents, Reminders & Country Info
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/documents`, `POST /api/documents`, `GET /api/documents/:docId/download`, `DELETE /api/documents/:docId`
- `GET /api/reminders`, `POST /api/reminders`, `PATCH /api/reminders/:id`, `DELETE /api/reminders/:id`
- `GET /api/travel-info/country?country=...`

