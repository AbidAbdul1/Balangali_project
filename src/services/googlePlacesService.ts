/**
 * Google Places API (New) Service (Backend)
 * 
 * Implements Google Places API (New) for dynamic popular attraction discovery worldwide:
 * - Text Search (New): https://places.googleapis.com/v1/places:searchText
 * - Place Details (New): https://places.googleapis.com/v1/places/{id}
 * - Place Photos: https://places.googleapis.com/v1/{photoName}/media
 * 
 * Features:
 * - Field Masking to minimize payload and quota costs
 * - Place ID deduplication & in-memory caching
 * - Converts Google Place to Application Destination model
 * - Proxies photos securely without exposing backend API keys
 */

import { Destination, DestinationCategory } from '../types/travel.ts';

export interface PlaceSearchOptions {
  query: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  pageSize?: number;
  pageToken?: string;
}

export interface PlaceSearchResult {
  success: boolean;
  places: Destination[];
  totalFound: number;
  nextPageToken?: string;
  source: 'google-places-api-new' | 'osm-overpass-fallback' | 'catalog-fallback';
  errorMessage?: string;
}

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

export class GooglePlacesService {
  private overrideKey?: string;
  private cache: Map<string, { timestamp: number; data: Destination[] }>;
  private photoUrlCache: Map<string, string | null>;
  private CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

  constructor(apiKey?: string) {
    this.overrideKey = apiKey;
    this.cache = new Map();
    this.photoUrlCache = new Map();
  }

  private get apiKey(): string {
    return this.overrideKey || process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Search places using Text Search (New)
   */
  async searchPlaces(opts: PlaceSearchOptions): Promise<PlaceSearchResult> {
    const { query, category = 'All', latitude, longitude, radiusMeters = 25000, pageSize = 12, pageToken } = opts;
    const cacheKey = `${query.toLowerCase().trim()}_${category}_${latitude || ''}_${longitude || ''}_${pageToken || 'p1'}`;

    // Check memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        success: true,
        places: cached.data,
        totalFound: cached.data.length,
        source: 'google-places-api-new',
      };
    }

    if (!this.apiKey) {
      return await this.searchPlacesFallback(query, category, latitude, longitude, radiusMeters, cacheKey);
    }

    try {
      // Build search query based on category and target destination
      let textQuery = query.trim();
      if (category && category !== 'All') {
        textQuery = `${category} in ${query.trim()}`;
      } else {
        textQuery = `top tourist attractions, landmarks and sights in ${query.trim()}`;
      }

      const requestBody: any = {
        textQuery,
        pageSize: Math.min(pageSize, 20),
        languageCode: 'en',
        ...(pageToken ? { pageToken } : {}),
      };

      // Location bias if coordinates are provided
      if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
        requestBody.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: radiusMeters,
          },
        };
      }

      const resp = await fetch(`${PLACES_BASE_URL}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.currentOpeningHours,places.types,places.priceLevel,places.googleMapsUri,places.websiteUri,places.editorialSummary',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await resp.json();

      if (resp.ok && Array.isArray(data.places)) {
        const seenIds = new Set<string>();
        const destinations: Destination[] = [];

        for (const place of data.places) {
          if (!place.id || seenIds.has(place.id)) continue;
          seenIds.add(place.id);

          const dest = this.mapPlaceToDestination(place);
          destinations.push(dest);
        }

        await this.enrichMissingPhotos(destinations, query);

        // Cache results
        this.cache.set(cacheKey, { timestamp: Date.now(), data: destinations });

        return {
          success: true,
          places: destinations,
          totalFound: destinations.length,
          nextPageToken: data.nextPageToken,
          source: 'google-places-api-new',
        };
      }

      console.warn('Places API (New) returned non-OK status:', resp.status, data.error?.message || data.error);
      return await this.searchPlacesFallback(query, category, latitude, longitude, radiusMeters, cacheKey);
    } catch (err: any) {
      console.warn('Places API (New) error, using OSM Overpass fallback:', err?.message);
      return await this.searchPlacesFallback(query, category, latitude, longitude, radiusMeters, cacheKey);
    }
  }

  /**
   * Get Place Details (New) by Place ID
   */
  async getPlaceDetails(placeId: string): Promise<{ success: boolean; place?: Destination; errorMessage?: string }> {
    if (!this.apiKey) {
      return { success: false, errorMessage: 'GOOGLE_MAPS_API_KEY missing' };
    }

    try {
      const resp = await fetch(`${PLACES_BASE_URL}/places/${placeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,location,rating,userRatingCount,photos,currentOpeningHours,types,priceLevel,googleMapsUri,websiteUri,editorialSummary',
        },
      });

      const data = await resp.json();
      if (resp.ok && data.id) {
        return { success: true, place: this.mapPlaceToDestination(data) };
      }

      return { success: false, errorMessage: data.error?.message || 'Place details not found' };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  /**
   * Nearby Search (New) around specific coordinates
   */
  async searchNearby(opts: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    includedTypes?: string[];
    maxResultCount?: number;
    minRating?: number;
    openNow?: boolean;
  }): Promise<PlaceSearchResult> {
    const {
      latitude,
      longitude,
      radiusMeters = 5000,
      includedTypes = ['tourist_attraction'],
      maxResultCount = 15,
      minRating = 0,
      openNow = false,
    } = opts;

    if (!this.apiKey) {
      return await this.searchNearbyFallback(latitude, longitude, radiusMeters, includedTypes, maxResultCount, minRating, openNow);
    }

    const cacheKey = `nearby_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${radiusMeters}_${includedTypes.join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      const filtered = this.filterPlaces(cached.data, minRating, openNow);
      return { success: true, places: filtered, totalFound: filtered.length, source: 'google-places-api-new' };
    }

    try {
      const resp = await fetch(`${PLACES_BASE_URL}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.currentOpeningHours,places.types,places.priceLevel,places.googleMapsUri,places.websiteUri,places.editorialSummary',
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: Math.min(maxResultCount, 20),
          languageCode: 'en',
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: Math.min(Math.max(radiusMeters, 200), 50000),
            },
          },
        }),
      });

      const data = await resp.json();
      if (resp.ok && Array.isArray(data.places)) {
        const seenIds = new Set<string>();
        const destinations: Destination[] = [];
        for (const place of data.places) {
          if (!place.id || seenIds.has(place.id)) continue;
          seenIds.add(place.id);
          destinations.push(this.mapPlaceToDestination(place));
        }
        await this.enrichMissingPhotos(destinations);
        this.cache.set(cacheKey, { timestamp: Date.now(), data: destinations });
        const filtered = this.filterPlaces(destinations, minRating, openNow);
        return {
          success: true,
          places: filtered,
          totalFound: filtered.length,
          source: 'google-places-api-new',
        };
      }

      return await this.searchNearbyFallback(latitude, longitude, radiusMeters, includedTypes, maxResultCount, minRating, openNow);
    } catch {
      return await this.searchNearbyFallback(latitude, longitude, radiusMeters, includedTypes, maxResultCount, minRating, openNow);
    }
  }

  /**
   * Free Real-World Fallback using OpenStreetMap Nominatim + Overpass API
   * Used when Google Places API key is invalid, restricted, or quota-exceeded.
   */
  private async searchPlacesFallback(
    query: string,
    category: string,
    latitude?: number,
    longitude?: number,
    radiusMeters: number = 15000,
    cacheKey?: string
  ): Promise<PlaceSearchResult> {
    try {
      let lat = latitude;
      let lng = longitude;

      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'AI-TRAVELMATE/1.0 (travel-planner)' },
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData) && nomData.length > 0) {
            lat = parseFloat(nomData[0].lat);
            lng = parseFloat(nomData[0].lon);
          }
        }
      }

      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        return {
          success: false,
          places: [],
          totalFound: 0,
          source: 'osm-overpass-fallback',
          errorMessage: `Could not locate "${query}" on OpenStreetMap.`,
        };
      }

      const r = Math.min(Math.max(radiusMeters, 5000), 25000);
      const catLower = (category || 'All').toLowerCase();
      let filters = [
        `nwr["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"](around:${r},${lat},${lng})`,
        `nwr["historic"](around:${r},${lat},${lng})`,
        `nwr["amenity"="place_of_worship"](around:${r},${lat},${lng})`,
        `nwr["leisure"~"park|garden|nature_reserve"](around:${r},${lat},${lng})`,
      ];

      if (catLower.includes('food') || catLower.includes('restaurant')) {
        filters = [
          `nwr["amenity"~"restaurant|cafe|fast_food"](around:${r},${lat},${lng})`,
        ];
      } else if (catLower.includes('temple') || catLower.includes('heritage')) {
        filters = [
          `nwr["amenity"="place_of_worship"](around:${r},${lat},${lng})`,
          `nwr["historic"](around:${r},${lat},${lng})`,
        ];
      } else if (catLower.includes('park') || catLower.includes('nature')) {
        filters = [
          `nwr["leisure"~"park|garden|nature_reserve"](around:${r},${lat},${lng})`,
          `nwr["natural"~"beach|peak|waterfall"](around:${r},${lat},${lng})`,
        ];
      } else if (catLower.includes('museum') || catLower.includes('art')) {
        filters = [
          `nwr["tourism"~"museum|gallery|artwork"](around:${r},${lat},${lng})`,
        ];
      }

      const overpassQuery = `[out:json][timeout:12];(${filters.join(';')};);out center 24;`;
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      const places: Destination[] = [];
      const seenNames = new Set<string>();

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        for (const el of ovData.elements || []) {
          const tags = el.tags || {};
          const name = tags['name:en'] || tags.name;
          if (!name) continue;
          const norm = name.toLowerCase().trim();
          if (seenNames.has(norm)) continue;
          seenNames.add(norm);

          const pLat = el.lat ?? el.center?.lat;
          const pLng = el.lon ?? el.center?.lon;
          if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;

          places.push(this.mapOsmElementToDestination(el.id, name, pLat, pLng, tags, query));
          if (places.length >= 18) break;
        }
      }

      if (places.length > 0 && cacheKey) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data: places });
      }

      return {
        success: places.length > 0,
        places,
        totalFound: places.length,
        source: 'osm-overpass-fallback',
        errorMessage: places.length === 0 ? `No named places found near ${query}.` : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        places: [],
        totalFound: 0,
        source: 'osm-overpass-fallback',
        errorMessage: err?.message || 'Failed to discover places.',
      };
    }
  }

  private async searchNearbyFallback(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    includedTypes: string[],
    maxResultCount: number,
    minRating: number,
    openNow: boolean
  ): Promise<PlaceSearchResult> {
    try {
      const r = Math.min(Math.max(radiusMeters, 500), 25000);
      const t = includedTypes[0] || 'tourist_attraction';
      const osmFilterMap: Record<string, string> = {
        restaurant: `nwr["amenity"="restaurant"](around:${r},${latitude},${longitude})`,
        cafe: `nwr["amenity"="cafe"](around:${r},${latitude},${longitude})`,
        lodging: `nwr["tourism"~"hotel|guest_house|hostel|resort"](around:${r},${latitude},${longitude})`,
        hospital: `nwr["amenity"~"hospital|clinic"](around:${r},${latitude},${longitude})`,
        pharmacy: `nwr["amenity"="pharmacy"](around:${r},${latitude},${longitude})`,
        atm: `nwr["amenity"="atm"](around:${r},${latitude},${longitude})`,
        shopping_mall: `nwr["shop"~"mall|department_store|supermarket"](around:${r},${latitude},${longitude})`,
        transit_station: `nwr["railway"~"station|halt"](around:${r},${latitude},${longitude});nwr["amenity"="bus_station"](around:${r},${latitude},${longitude})`,
        tourist_attraction: `nwr["tourism"~"attraction|museum|viewpoint"](around:${r},${latitude},${longitude});nwr["historic"](around:${r},${latitude},${longitude})`,
      };
      const filter = osmFilterMap[t] || osmFilterMap.tourist_attraction;
      const overpassQuery = `[out:json][timeout:12];(${filter};);out center 20;`;

      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      const places: Destination[] = [];
      const seenNames = new Set<string>();
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        for (const el of ovData.elements || []) {
          const tags = el.tags || {};
          const name = tags['name:en'] || tags.name || (t === 'atm' && tags.operator ? `${tags.operator} ATM` : '');
          if (!name) continue;
          const norm = name.toLowerCase().trim();
          if (seenNames.has(norm)) continue;
          seenNames.add(norm);

          const pLat = el.lat ?? el.center?.lat;
          const pLng = el.lon ?? el.center?.lon;
          if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;

          places.push(this.mapOsmElementToDestination(el.id, name, pLat, pLng, tags, 'Nearby'));
          if (places.length >= maxResultCount) break;
        }
      }

      const filtered = this.filterPlaces(places, minRating, openNow);
      return {
        success: true,
        places: filtered,
        totalFound: filtered.length,
        source: 'osm-overpass-fallback',
      };
    } catch (err: any) {
      return {
        success: false,
        places: [],
        totalFound: 0,
        source: 'osm-overpass-fallback',
        errorMessage: err?.message || 'Nearby search fallback failed.',
      };
    }
  }

  private mapOsmElementToDestination(
    osmId: number | string,
    name: string,
    lat: number,
    lng: number,
    tags: Record<string, string>,
    cityLabel: string
  ): Destination {
    let category: DestinationCategory = 'Heritage & Temples';
    if (tags.leisure || tags.natural) category = 'Nature & Islands';
    else if (tags.tourism === 'museum' || tags.tourism === 'gallery') category = 'Culture & Museums';
    else if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') category = 'Food & Cuisine';
    else if (tags.tourism === 'theme_park' || tags.tourism === 'zoo') category = 'Parks & Recreation';
    else if (tags.historic) category = 'Caves & Architecture';

    const addressParts = [tags['addr:street'], tags['addr:suburb'], tags['addr:city'] || cityLabel].filter(Boolean);
    const address = addressParts.join(', ') || cityLabel;
    const tagList = [tags.tourism, tags.historic, tags.amenity, tags.leisure, tags.cuisine].filter(Boolean);

    return {
      id: `osm-${osmId}`,
      name,
      category,
      latitude: lat,
      longitude: lng,
      description: `${category} in ${address}. Verified OpenStreetMap geographic listing.`,
      shortDescription: `${category} · ${address}`,
      rating: 0,
      reviewsCount: 0,
      feeINR: 0,
      estimatedDurationMin: 75,
      bestTimeToVisit: 'Morning or late afternoon',
      openingHours: tags.opening_hours || 'Check local hours',
      address,
      dataSource: 'OpenStreetMap (Overpass)',
      isOutdoor: !['museum', 'gallery', 'restaurant', 'cafe', 'hospital', 'pharmacy', 'hotel'].some((k) =>
        tagList.includes(k)
      ),
      tags: tagList.slice(0, 4),
      isAiDiscovered: true,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      websiteUri: tags.website || tags['contact:website'],
    };
  }

  private async enrichMissingPhotos(places: Destination[], cityHint?: string): Promise<void> {
    const targets = places.filter((p) => !p.imageUrl).slice(0, 12);
    if (targets.length === 0) return;

    const fetchThumb = async (place: Destination) => {
      const cached = this.photoUrlCache.get(place.id);
      if (cached !== undefined) {
        if (cached) {
          place.imageUrl = cached;
          place.photoAttribution = place.photoAttribution || 'Wikimedia Commons';
        }
        return;
      }
      try {
        const cleanCity = cityHint ? cityHint.split(',')[0].trim() : '';
        const searchTerm = cleanCity && !place.name.toLowerCase().includes(cleanCity.toLowerCase())
          ? `${place.name} ${cleanCity}`
          : place.name;
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(
          searchTerm
        )}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 7000);
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'AI-TravelMate/1.0 (https://github.com/ai-travelmate)' },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (resp.ok) {
          const json = await resp.json();
          const pages = Object.values(json.query?.pages || {}) as any[];
          const thumb = pages[0]?.thumbnail?.source;
          if (thumb && typeof thumb === 'string') {
            this.photoUrlCache.set(place.id, thumb);
            place.imageUrl = thumb;
            place.photoAttribution = 'Wikimedia Commons';
            return;
          }
        }
      } catch {
        // Ignore timeout/network errors for individual thumbnails
      }
    };

    // Process 2 at a time with slight stagger to avoid Wikipedia 429 rate-limits
    for (let i = 0; i < targets.length; i += 2) {
      await Promise.all(targets.slice(i, i + 2).map(fetchThumb));
      if (i + 2 < targets.length) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  private filterPlaces(places: Destination[], minRating: number, openNow: boolean): Destination[] {
    return places.filter((p) => {
      if (minRating > 0 && p.rating < minRating) return false;
      if (openNow && p.openNow === false) return false;
      return true;
    });
  }

  /**
   * Fetch Place Photo Stream / Buffer
   */
  async fetchPhotoMedia(photoName: string, maxHeight: number = 600, maxWidth: number = 800): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
    if (!this.apiKey || !photoName) return null;

    try {
      const cleanName = photoName.startsWith('places/') ? photoName : `places/${photoName}`;
      const url = `${PLACES_BASE_URL}/${cleanName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${this.apiKey}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        return { buffer, contentType };
      }
    } catch (err) {
      console.warn('Place Photo fetch error:', err);
    }
    return null;
  }

  /**
   * Convert Google Place (New) object to AI-Travelmate Destination interface
   */
  private mapPlaceToDestination(place: any): Destination {
    const name = place.displayName?.text || place.displayName || 'Scenic Landmark';
    const lat = place.location?.latitude || 0;
    const lng = place.location?.longitude || 0;
    const types: string[] = place.types || [];
    const rating = typeof place.rating === 'number' ? place.rating : 0;
    const reviewsCount = typeof place.userRatingCount === 'number' ? place.userRatingCount : 0;

    // Map Google place types to app's DestinationCategory
    let category: DestinationCategory = 'Heritage & Temples';
    if (types.some((t) => /park|garden|natural_feature|beach|nature|mountain|campground/i.test(t))) {
      category = 'Nature & Islands';
    } else if (types.some((t) => /museum|art_gallery|cultural_center/i.test(t))) {
      category = 'Culture & Museums';
    } else if (types.some((t) => /cave|monument|archaeological_site|historic/i.test(t))) {
      category = 'Caves & Architecture';
    } else if (types.some((t) => /amusement_park|zoo|aquarium|stadium|bowling_alley/i.test(t))) {
      category = 'Parks & Recreation';
    } else if (types.some((t) => /restaurant|food|cafe|bakery|bar|meal_takeaway/i.test(t))) {
      category = 'Food & Cuisine';
    } else if (types.some((t) => /hindu_temple|place_of_worship|church|mosque|shrine/i.test(t))) {
      category = 'Heritage & Temples';
    }

    // Secure photo URL proxied through backend
    let imageUrl = '';
    if (place.photos && place.photos.length > 0 && place.photos[0].name) {
      imageUrl = `/api/places/photo?name=${encodeURIComponent(place.photos[0].name)}`;
    }

    const openingHoursDesc =
      place.currentOpeningHours?.weekdayDescriptions?.[0] ||
      (place.currentOpeningHours?.openNow ? 'Open Now' : 'Check hours locally');

    const editorialText = place.editorialSummary?.text || '';
    const ratingStr = rating > 0 ? `${rating}★` : 'Unrated';
    const reviewsStr = reviewsCount > 0 ? ` by ${reviewsCount.toLocaleString()} visitors` : '';
    const desc =
      editorialText ||
      `${category} location in ${place.formattedAddress?.split(',')?.[0] || 'the area'}. ${rating > 0 ? `Rated ${ratingStr}${reviewsStr} on Google Maps.` : 'Details via Google Places.'}`;

    const photoAttribution = place.photos?.[0]?.authorAttributions?.[0]?.displayName;

    return {
      id: place.id,
      name,
      category,
      latitude: lat,
      longitude: lng,
      description: desc,
      shortDescription: editorialText ? editorialText.slice(0, 110) + '...' : `${category} · ${ratingStr}`,
      imageUrl: imageUrl || undefined,
      rating,
      reviewsCount,
      feeINR: 0,
      estimatedDurationMin: 90,
      bestTimeToVisit: 'Morning or late afternoon',
      openingHours: openingHoursDesc,
      address: place.formattedAddress || `${name}`,
      dataSource: 'Google Places API (New)',
      isOutdoor: !types.some((t) => /museum|art_gallery|restaurant|hospital|pharmacy|lodging/i.test(t)),
      tags: types.slice(0, 4),
      isAiDiscovered: true,
      aiHighlights: rating > 0
        ? `Google Places listing with ${rating}★ from ${reviewsCount.toLocaleString()} visitor reviews.`
        : 'Verified Google Places listing.',
      googleMapsUri: place.googleMapsUri,
      websiteUri: place.websiteUri,
      priceLevel: place.priceLevel,
      openNow: place.currentOpeningHours?.openNow,
      photoAttribution,
    };
  }
}
