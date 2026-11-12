/**
 * Google Geocoding Service (Backend)
 * 
 * Provides forward and reverse geocoding via Google Maps Platform Geocoding API.
 * Uses the secure backend GOOGLE_MAPS_API_KEY.
 * Gracefully falls back to OpenStreetMap Nominatim if Google quota is exceeded
 * or billing is not yet enabled on the Google Cloud project.
 */

export interface GeocodedLocation {
  name: string;
  title: string;
  subtitle?: string;
  fullName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  streetNumber?: string;
  route?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  source: 'google-maps-geocoding-api' | 'osm-nominatim-fallback' | 'raw-coordinates';
}

const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export class GoogleGeocodingService {
  private overrideKey?: string;

  constructor(apiKey?: string) {
    this.overrideKey = apiKey;
  }

  private get apiKey(): string {
    return this.overrideKey || process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Forward Geocoding: Convert text address or landmark into coordinates
   */
  async forwardGeocode(query: string): Promise<{
    success: boolean;
    locations: GeocodedLocation[];
    source: string;
    errorMessage?: string;
  }> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { success: false, locations: [], source: 'none', errorMessage: 'Empty query' };
    }

    // 1. Check if user typed direct latitude, longitude numbers (e.g. "16.506, 80.648")
    const coordMatch = trimmed.match(/@?(-?\d+\.\d+)[,\s/]+(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const rev = await this.reverseGeocode(lat, lon);
        if (rev.success && rev.location) {
          return { success: true, locations: [rev.location], source: 'raw-coordinates' };
        }
      }
    }

    // 2. Try Google Geocoding API if key is available
    if (this.apiKey) {
      try {
        const url = `${GOOGLE_GEOCODING_URL}?address=${encodeURIComponent(trimmed)}&key=${this.apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const locations: GeocodedLocation[] = data.results.map((res: any) => {
            const parsed = this.parseAddressComponents(res.address_components || []);
            const primaryName = parsed.neighborhood || parsed.city || res.formatted_address.split(',')[0];
            return {
              name: primaryName,
              title: primaryName,
              subtitle: [parsed.city, parsed.state].filter(Boolean).join(', '),
              fullName: res.formatted_address,
              formattedAddress: res.formatted_address,
              latitude: res.geometry.location.lat,
              longitude: res.geometry.location.lng,
              placeId: res.place_id,
              ...parsed,
              source: 'google-maps-geocoding-api',
            };
          });
          return { success: true, locations, source: 'google-maps-geocoding-api' };
        }

        if (data.status === 'ZERO_RESULTS') {
          return { success: true, locations: [], source: 'google-maps-geocoding-api' };
        }

        console.warn(`Google Geocoding API returned status ${data.status}:`, data.error_message || 'Falling back to Nominatim');
      } catch (err: any) {
        console.warn('Google Geocoding request failed:', err?.message || err);
      }
    }

    // 3. Robust OpenStreetMap Nominatim Fallback
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&limit=10&addressdetails=1`;
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'AI-TRAVELMATE/2.0 (intelligent-travel-planner)' },
      });

      if (response.ok) {
        const items = await response.json();
        const locations: GeocodedLocation[] = items.map((item: any) => {
          const addr = item.address || {};
          const primaryName =
            item.name ||
            addr.railway ||
            addr.amenity ||
            addr.tourism ||
            addr.road ||
            item.display_name.split(',')[0].trim();

          const context = [addr.suburb || addr.neighbourhood, addr.city || addr.town, addr.state]
            .filter(Boolean)
            .slice(0, 2)
            .join(', ');

          return {
            name: context && !primaryName.includes(context) ? `${primaryName}, ${context}` : primaryName,
            title: primaryName,
            subtitle: context,
            fullName: item.display_name,
            formattedAddress: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            placeId: item.osm_id ? String(item.osm_id) : undefined,
            neighborhood: addr.neighbourhood || addr.suburb,
            city: addr.city || addr.town || addr.village,
            state: addr.state,
            country: addr.country,
            postalCode: addr.postcode,
            source: 'osm-nominatim-fallback',
          };
        });
        return { success: true, locations, source: 'osm-nominatim-fallback' };
      }
    } catch (nomErr: any) {
      console.error('Nominatim geocoding fallback error:', nomErr);
    }

    return {
      success: false,
      locations: [],
      source: 'none',
      errorMessage: 'Could not geocode address.',
    };
  }

  /**
   * Reverse Geocoding: Convert coordinates to human-readable address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{
    success: boolean;
    location?: GeocodedLocation;
    source: string;
    errorMessage?: string;
  }> {
    if (isNaN(latitude) || isNaN(longitude)) {
      return { success: false, source: 'none', errorMessage: 'Invalid coordinates' };
    }

    // 1. Try Google Geocoding API if key configured
    if (this.apiKey) {
      try {
        const url = `${GOOGLE_GEOCODING_URL}?latlng=${latitude},${longitude}&key=${this.apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const first = data.results[0];
          const parsed = this.parseAddressComponents(first.address_components || []);
          const primaryName = parsed.neighborhood || parsed.route || parsed.city || first.formatted_address.split(',')[0];

          return {
            success: true,
            location: {
              name: primaryName,
              title: primaryName,
              subtitle: [parsed.city, parsed.state].filter(Boolean).join(', '),
              fullName: first.formatted_address,
              formattedAddress: first.formatted_address,
              latitude,
              longitude,
              placeId: first.place_id,
              ...parsed,
              source: 'google-maps-geocoding-api',
            },
            source: 'google-maps-geocoding-api',
          };
        }

        console.warn(`Google Reverse Geocoding returned status ${data.status}:`, data.error_message || 'Falling back to Nominatim');
      } catch (err: any) {
        console.warn('Google Reverse Geocoding request failed:', err?.message || err);
      }
    }

    // 2. OpenStreetMap Nominatim Reverse Geocoding Fallback
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'AI-TRAVELMATE/2.0 (intelligent-travel-planner)' },
      });

      if (response.ok) {
        const item = await response.json();
        const addr = item.address || {};
        const spotName = item.name || addr.railway || addr.amenity || addr.tourism || addr.road || item.display_name?.split(',')[0];

        return {
          success: true,
          location: {
            name: spotName || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            title: spotName || 'Detected Location',
            fullName: item.display_name,
            formattedAddress: item.display_name,
            latitude,
            longitude,
            placeId: item.osm_id ? String(item.osm_id) : undefined,
            streetNumber: addr.house_number,
            route: addr.road,
            neighborhood: addr.neighbourhood || addr.suburb,
            city: addr.city || addr.town || addr.village,
            state: addr.state,
            country: addr.country,
            postalCode: addr.postcode,
            source: 'osm-nominatim-fallback',
          },
          source: 'osm-nominatim-fallback',
        };
      }
    } catch (nomErr: any) {
      console.warn('Reverse geocode fallback error:', nomErr);
    }

    // 3. Raw Coordinates Fallback (never crash)
    return {
      success: true,
      location: {
        name: `Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
        title: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        fullName: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        source: 'raw-coordinates',
      },
      source: 'raw-coordinates',
    };
  }

  private parseAddressComponents(components: Array<{ long_name: string; short_name: string; types: string[] }>) {
    let streetNumber: string | undefined;
    let route: string | undefined;
    let neighborhood: string | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let country: string | undefined;
    let postalCode: string | undefined;

    for (const c of components) {
      if (c.types.includes('street_number')) streetNumber = c.long_name;
      if (c.types.includes('route')) route = c.long_name;
      if (c.types.includes('neighborhood') || c.types.includes('sublocality')) neighborhood = c.long_name;
      if (c.types.includes('locality')) city = c.long_name;
      else if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
      if (c.types.includes('administrative_area_level_1')) state = c.long_name;
      if (c.types.includes('country')) country = c.long_name;
      if (c.types.includes('postal_code')) postalCode = c.long_name;
    }

    return { streetNumber, route, neighborhood, city, state, country, postalCode };
  }
}

