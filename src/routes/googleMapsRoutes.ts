/**
 * Google Maps Platform API Express Routes
 * 
 * Endpoints:
 * - GET  /api/geocode                 -> Forward geocoding
 * - GET  /api/geocode/reverse         -> Reverse geocoding
 * - POST /api/geocode/google-locate   -> Geolocation API
 * - GET  /api/places/search           -> Places API (New) Text/Nearby Search
 * - GET  /api/places/details/:placeId -> Place Details (New)
 * - GET  /api/places/photo            -> Secure Photo Streaming Proxy
 */

import { Router, Request, Response } from 'express';
import { GoogleGeocodingService } from '../services/googleGeocodingService.ts';
import { GoogleGeolocationService } from '../services/googleGeolocationService.ts';
import { GooglePlacesService } from '../services/googlePlacesService.ts';

export const googleMapsRouter = Router();

const geocodingService = new GoogleGeocodingService();
const geolocationService = new GoogleGeolocationService();
const placesService = new GooglePlacesService();

// 1. Forward Geocoding
googleMapsRouter.get('/geocode', async (req: Request, res: Response) => {
  const addressQuery = (req.query.address as string) || (req.query.q as string) || '';
  if (!addressQuery.trim()) {
    return res.status(400).json({ success: false, error: 'Query or address parameter is required' });
  }

  const result = await geocodingService.forwardGeocode(addressQuery);
  return res.json(result);
});

// 2. Reverse Geocoding
googleMapsRouter.get('/geocode/reverse', async (req: Request, res: Response) => {
  const latStr = (req.query.lat as string) || (req.query.latitude as string);
  const lngStr = (req.query.lng as string) || (req.query.longitude as string);

  if (!latStr || !lngStr) {
    return res.status(400).json({ success: false, error: 'Latitude and longitude parameters are required' });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const result = await geocodingService.reverseGeocode(lat, lng);
  if (result.success && result.location) {
    // Return backward-compatible shape expected by existing callers as well as new structure
    return res.json({
      success: true,
      ...result.location,
      location: result.location,
    });
  }

  return res.status(500).json({ success: false, error: result.errorMessage || 'Reverse geocoding failed' });
});

// 3. Google Geolocation API
googleMapsRouter.post('/geocode/google-locate', async (req: Request, res: Response) => {
  const payload = req.body || { considerIp: true };
  const result = await geolocationService.locate(payload);

  if (result.success && result.latitude && result.longitude) {
    // Reverse geocode to get human place name
    const rev = await geocodingService.reverseGeocode(result.latitude, result.longitude);
    return res.json({
      ...result,
      name: rev.location?.name || `Detected Location (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})`,
      fullName: rev.location?.fullName,
    });
  }

  return res.status(result.errorCode === 'MISSING_API_KEY' ? 404 : 400).json(result);
});

// 4. Places API (New) Search
googleMapsRouter.get('/places/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || (req.query.query as string) || (req.query.destination as string) || '';
  if (!query.trim()) {
    return res.status(400).json({ success: false, error: 'Destination or query parameter is required' });
  }

  const category = (req.query.category as string) || 'All';
  const latStr = req.query.latitude as string;
  const lngStr = req.query.longitude as string;
  const radiusStr = req.query.radius as string;

  const latitude = latStr ? parseFloat(latStr) : undefined;
  const longitude = lngStr ? parseFloat(lngStr) : undefined;
  const radiusMeters = radiusStr ? parseInt(radiusStr, 10) : undefined;
  const pageToken = (req.query.pageToken as string) || undefined;

  const result = await placesService.searchPlaces({
    query,
    category,
    latitude,
    longitude,
    radiusMeters,
    pageToken,
  });

  return res.json(result);
});

// 4b. Places API (New) Nearby Search (Nearby Discovery, Hotels, Restaurants, Emergency Services)
googleMapsRouter.get('/places/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat((req.query.lat as string) || (req.query.latitude as string) || '');
  const lng = parseFloat((req.query.lng as string) || (req.query.longitude as string) || '');
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required.' });
  }

  const typesParam = (req.query.types as string) || (req.query.type as string) || 'tourist_attraction';
  const includedTypes = typesParam.split(',').map((t) => t.trim()).filter(Boolean);
  const radiusMeters = parseInt((req.query.radius as string) || '5000', 10);
  const minRating = parseFloat((req.query.minRating as string) || '0');
  const openNow = req.query.openNow === 'true';

  const result = await placesService.searchNearby({
    latitude: lat,
    longitude: lng,
    radiusMeters: isNaN(radiusMeters) ? 5000 : radiusMeters,
    includedTypes,
    minRating: isNaN(minRating) ? 0 : minRating,
    openNow,
  });

  return res.json(result);
});

// 4c. Multi-Stop Attraction Order Optimizer (Nearest-Neighbor + 2-opt)
googleMapsRouter.post('/routes/optimize-order', (req: Request, res: Response) => {
  const origin = req.body?.origin;
  const stops: any[] = Array.isArray(req.body?.stops) ? req.body.stops : [];

  if (!origin || typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid origin coordinates are required.' });
  }
  if (stops.length < 2) {
    return res.json({ success: true, orderedStops: stops, totalDistanceKm: 0, savedDistanceKm: 0 });
  }

  const haversineKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const routeDist = (seq: any[]) => {
    let sum = haversineKm(origin, seq[0]);
    for (let i = 0; i < seq.length - 1; i++) {
      sum += haversineKm(seq[i], seq[i + 1]);
    }
    return sum;
  };

  const originalDistanceKm = routeDist(stops);

  // Nearest-neighbor starting from origin
  const remaining = [...stops];
  const ordered: any[] = [];
  let curr = origin;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(curr, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    curr = next;
  }

  // 2-opt refinement
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < ordered.length - 1; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const candidate = [
          ...ordered.slice(0, i),
          ...ordered.slice(i, j + 1).reverse(),
          ...ordered.slice(j + 1),
        ];
        if (routeDist(candidate) + 0.05 < routeDist(ordered)) {
          ordered.splice(0, ordered.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  const optimizedDistanceKm = routeDist(ordered);
  return res.json({
    success: true,
    orderedStops: ordered,
    originalDistanceKm: Number(originalDistanceKm.toFixed(2)),
    totalDistanceKm: Number(optimizedDistanceKm.toFixed(2)),
    savedDistanceKm: Number(Math.max(0, originalDistanceKm - optimizedDistanceKm).toFixed(2)),
  });
});

// 5. Places API (New) Details
googleMapsRouter.get('/places/details/:placeId', async (req: Request, res: Response) => {
  const placeId = req.params.placeId;
  if (!placeId) {
    return res.status(400).json({ success: false, error: 'placeId is required' });
  }

  const result = await placesService.getPlaceDetails(placeId);
  return res.json(result);
});

// 6. Secure Place Photo Streaming Proxy
googleMapsRouter.get('/places/photo', async (req: Request, res: Response) => {
  const photoName = req.query.name as string;
  if (!photoName) {
    return res.status(400).json({ error: 'Photo resource name is required' });
  }

  const maxHeight = parseInt((req.query.maxHeight as string) || '600', 10);
  const maxWidth = parseInt((req.query.maxWidth as string) || '800', 10);

  const media = await placesService.fetchPhotoMedia(photoName, maxHeight, maxWidth);
  if (!media) {
    return res.status(404).json({ error: 'Photo not found or quota exceeded' });
  }

  res.setHeader('Content-Type', media.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours client cache
  return res.send(Buffer.from(media.buffer));
});
