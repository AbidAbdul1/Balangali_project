/**
 * Google Geolocation Service (Backend)
 * 
 * Interacts with Google Maps Platform Geolocation API:
 * https://www.googleapis.com/geolocation/v1/geolocate
 * 
 * Rules:
 * - Only queries Google when real network info is provided or explicit IP fallback requested
 * - Never fabricates BSSIDs, cell towers, or signal strengths
 * - Handles quota limits, missing keys, and Cloud Project Billing errors gracefully
 */

export interface GeolocationRequestPayload {
  wifiAccessPoints?: Array<{
    macAddress: string;
    signalStrength?: number;
    age?: number;
    channel?: number;
    signalToNoiseRatio?: number;
  }>;
  cellTowers?: Array<{
    cellId: number;
    locationAreaCode: number;
    mobileCountryCode: number;
    mobileNetworkCode: number;
    age?: number;
    signalStrength?: number;
    timingAdvance?: number;
  }>;
  considerIp?: boolean;
}

export interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  source: 'google-maps-geolocation-api' | 'none';
  errorMessage?: string;
  errorCode?: string;
}

const GOOGLE_GEOLOCATION_URL = 'https://www.googleapis.com/geolocation/v1/geolocate';

export class GoogleGeolocationService {
  private overrideKey?: string;

  constructor(apiKey?: string) {
    this.overrideKey = apiKey;
  }

  private get apiKey(): string {
    return this.overrideKey || process.env.GOOGLE_MAPS_API_KEY || '';
  }

  async locate(payload: GeolocationRequestPayload): Promise<GeolocationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        source: 'none',
        errorMessage: 'GOOGLE_MAPS_API_KEY is not configured on server.',
        errorCode: 'MISSING_API_KEY',
      };
    }

    try {
      const resp = await fetch(`${GOOGLE_GEOLOCATION_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (resp.ok && data.location) {
        return {
          success: true,
          latitude: data.location.lat,
          longitude: data.location.lng,
          accuracy: Math.round(data.accuracy || 40),
          source: 'google-maps-geolocation-api',
        };
      }

      const errMsg = data.error?.message || `Google Geolocation failed with status ${resp.status}`;
      const errReason = data.error?.errors?.[0]?.reason || 'unknown';

      console.warn('Google Geolocation API warning:', errMsg);
      return {
        success: false,
        source: 'none',
        errorMessage: errMsg,
        errorCode: errReason,
      };
    } catch (err: any) {
      console.error('Google Geolocation network error:', err?.message || err);
      return {
        success: false,
        source: 'none',
        errorMessage: err?.message || 'Network timeout contacting Google Geolocation API',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}

