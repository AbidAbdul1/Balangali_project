/**
 * High-Reliability Laptop Location Detection Engine
 * 
 * Implements strict detection priority without mobile phone dependency:
 * 1. Windows Location Services / Browser Wi-Fi Positioning (W3C Geolocation API)
 *    - Uses Windows Location Services and surrounding Wi-Fi router BSSID triangulation
 *    - True street-level accuracy (typically ±15m - ±80m)
 * 2. Public IP-based Geolocation Fallback
 *    - Clearly labeled as coarse / regional estimate (never fabricated as exact GPS)
 *    - Detects Cellular Carrier Gateways, Hotspots, and VPN connections
 * 3. Manual Entry & Interactive Map Pin Drop
 *    - Street address autocomplete or direct Leaflet map pin placement
 */

export type LocationDetectionMethod =
    | 'windows-location-service'
    | 'google-maps-api'
    | 'wifi-triangulation'
    | 'ip-geolocation-estimate'
    | 'manual-address-search'
    | 'map-pin-drop'
    | 'default-hub';

export type ConnectionType = 'wifi' | 'mobile-hotspot' | 'ethernet' | 'usb-tethering' | 'vpn' | 'offline' | 'unknown';

export type PermissionStateStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface LocationDiagnostics {
    latitude: number;
    longitude: number;
    name: string;
    road?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    detectionMethod: LocationDetectionMethod;
    detectionMethodLabel: string;
    accuracyMeters: number;
    accuracyQuality: 'exact' | 'high' | 'moderate' | 'coarse' | 'approximate';
    locationQuality: 'Precise' | 'Approximate' | 'Unknown';
    connectionType: ConnectionType;
    connectionTypeLabel: string;
    permissionStatus: PermissionStateStatus;
    lastUpdated: string;
    isCellularHotspot: boolean;
    isVPNOrProxy: boolean;
    ispName?: string;
    ipAddress?: string;
    statusNote?: string;
}

// Discard false datacenter readings (such as cloud container IPs in Taiwan / Google LLC)
function isDatacenterLocation(country?: string, city?: string, org?: string): boolean {
    if (country === 'Taiwan' || city === 'Taipei') return true;
    if (org && /Google|Amazon|Microsoft|Cloud|DigitalOcean/i.test(org)) return true;
    return false;
}

// Inspect mobile cellular carrier patterns
export function isMobileCellularISP(ispOrOrg?: string): boolean {
    if (!ispOrOrg) return false;
    return /jio|airtel|vodafone|idea|vi\s|cellular|mobile|wireless|telecom|bsnl|t-mobile|verizon|at&t/i.test(ispOrOrg);
}

// Inspect VPN/Proxy patterns in ISP/Org
export function isVpnOrProxyISP(ispOrOrg?: string): boolean {
    if (!ispOrOrg) return false;
    return /vpn|proxy|hosting|datacenter|ovh|linode|mullvad|nord|expressvpn|surfshark|cloudflare/i.test(ispOrOrg);
}

/**
 * Detect client network connection type from browser APIs and network info
 */
export function detectClientConnectionType(isp?: string): ConnectionType {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'offline';
    }

    // Network Information API if supported
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (conn) {
        if (conn.type === 'ethernet') return 'ethernet';
        if (conn.type === 'wifi') return 'wifi';
        if (conn.type === 'cellular') return 'mobile-hotspot';
    }

    if (isp) {
        if (isVpnOrProxyISP(isp)) return 'vpn';
        if (isMobileCellularISP(isp)) return 'mobile-hotspot';
    }

    return 'wifi';
}

/**
 * Query permission status for geolocation
 */
export async function getGeolocationPermissionStatus(): Promise<PermissionStateStatus> {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.geolocation) {
        return typeof navigator !== 'undefined' && !navigator.geolocation ? 'unsupported' : 'prompt';
    }

    try {
        const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return res.state as PermissionStateStatus;
    } catch {
        return 'prompt';
    }
}

/**
 * Method 1: Hardware Windows Location Services / Browser Wi-Fi Positioning
 */
async function queryWindowsLocationService(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    method: LocationDetectionMethod;
} | { error: string; code: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return null;
    }

    const getPosition = (opts: PositionOptions) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, opts);
        });

    try {
        // 1. High-accuracy query FIRST: Triggers Windows Location Provider & scans surrounding Wi-Fi BSSIDs
        const pos = await getPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0, // Force fresh location, don't use stale cached location
        }).catch(async (fineErr) => {
            // If high accuracy times out, try standard accuracy
            console.warn('High accuracy geolocation failed, attempting standard:', fineErr);
            return await getPosition({
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 30000,
            }).catch((fastErr) => {
                throw fineErr || fastErr;
            });
        });

        if (pos && pos.coords) {
            const accuracy = pos.coords.accuracy || 100;
            // Exact street level (<= 100m) or Wi-Fi positioning (<= 1000m)
            const method: LocationDetectionMethod =
                accuracy <= 100 ? 'windows-location-service' : 'wifi-triangulation';

            return {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy,
                method,
            };
        }
    } catch (err: any) {
        const code = err?.code || 0;
        const msg = err?.message || 'Location query failed';
        console.warn(`Windows Location Service error [code ${code}]:`, msg);
        return { error: msg, code };
    }

    return null;
}

/**
 * Main Location Detection Orchestrator
 */
export async function detectLaptopLocation(): Promise<LocationDiagnostics> {
    const permStatus = await getGeolocationPermissionStatus();
    const isOnline = typeof navigator === 'undefined' || navigator.onLine;

    if (!isOnline) {
        return {
            latitude: 17.4339,
            longitude: 78.5042,
            name: 'Offline Mode (Default Station: Hyderabad, India)',
            city: 'Hyderabad',
            state: 'Telangana',
            country: 'India',
            detectionMethod: 'default-hub',
            detectionMethodLabel: 'Offline Default',
            accuracyMeters: 50000,
            accuracyQuality: 'approximate',
            locationQuality: 'Unknown',
            connectionType: 'offline',
            connectionTypeLabel: 'Offline (No Internet)',
            permissionStatus: permStatus,
            lastUpdated: new Date().toLocaleTimeString(),
            isCellularHotspot: false,
            isVPNOrProxy: false,
            statusNote: 'You are currently offline. Connect to the internet or manually choose a location.',
        };
    }

    // Priority 1: Windows Location Services & Wi-Fi Triangulation (Native Laptop Geolocation)
    const nativeFixResult = await queryWindowsLocationService();
    if (nativeFixResult && !('error' in nativeFixResult)) {
        const nativeFix = nativeFixResult;
        const reverseData = await reverseGeocodeDetailed(nativeFix.latitude, nativeFix.longitude);
        const connType = detectClientConnectionType();
        const connLabel = connType === 'mobile-hotspot'
            ? 'Mobile Hotspot / Cellular Tethering'
            : connType === 'ethernet'
                ? 'Ethernet Wired Connection'
                : 'Wi-Fi Connection';

        const quality = nativeFix.accuracy <= 30
            ? 'exact'
            : nativeFix.accuracy <= 100
                ? 'high'
                : nativeFix.accuracy <= 500
                    ? 'moderate'
                    : 'coarse';

        return {
            latitude: nativeFix.latitude,
            longitude: nativeFix.longitude,
            name: reverseData?.name || `Exact Location (${nativeFix.latitude.toFixed(4)}, ${nativeFix.longitude.toFixed(4)})`,
            road: reverseData?.road,
            neighbourhood: reverseData?.neighbourhood,
            city: reverseData?.city,
            state: reverseData?.state,
            country: reverseData?.country,
            postcode: reverseData?.postcode,
            detectionMethod: nativeFix.method,
            detectionMethodLabel: nativeFix.method === 'windows-location-service'
                ? 'Windows Location Services API'
                : 'Wi-Fi Router Triangulation',
            accuracyMeters: Math.round(nativeFix.accuracy),
            accuracyQuality: quality,
            locationQuality: nativeFix.accuracy <= 100 ? 'Precise' : 'Approximate',
            connectionType: connType,
            connectionTypeLabel: connLabel,
            permissionStatus: 'granted',
            lastUpdated: new Date().toLocaleTimeString(),
            isCellularHotspot: connType === 'mobile-hotspot',
            isVPNOrProxy: false,
            statusNote: nativeFix.accuracy <= 100
                ? `Locked via native laptop sensors with ±${Math.round(nativeFix.accuracy)}m street precision.`
                : `Wi-Fi positioning returned ±${Math.round(nativeFix.accuracy)}m radius. For exact house/building, use map pin.`,
        };
    }

    const locationDenied = nativeFixResult && 'error' in nativeFixResult && nativeFixResult.code === 1;
    const locationUnavailable = nativeFixResult && 'error' in nativeFixResult && nativeFixResult.code === 2;

    // Priority 2: Google Maps Platform Geolocation API (when API key is configured)
    try {
        const googleLocRes = await fetch('/api/geocode/google-locate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ considerIp: true }),
        });
        if (googleLocRes.ok) {
            const gData = await googleLocRes.json();
            if (gData.success && gData.latitude && gData.longitude) {
                const quality = gData.accuracy <= 50 ? 'exact' : gData.accuracy <= 150 ? 'high' : 'moderate';
                return {
                    latitude: gData.latitude,
                    longitude: gData.longitude,
                    name: gData.name,
                    detectionMethod: 'google-maps-api',
                    detectionMethodLabel: 'Google Maps Geolocation API',
                    accuracyMeters: Math.round(gData.accuracy),
                    accuracyQuality: quality,
                    locationQuality: gData.accuracy <= 100 ? 'Precise' : 'Approximate',
                    connectionType: 'wifi',
                    connectionTypeLabel: 'Google Network Geolocation',
                    permissionStatus: 'granted',
                    lastUpdated: new Date().toLocaleTimeString(),
                    isCellularHotspot: false,
                    isVPNOrProxy: false,
                    statusNote: `Google Maps triangulation locked with ±${Math.round(gData.accuracy)}m precision.`,
                };
            }
        }
    } catch (gErr) {
        console.warn('Google Maps Geolocation API lookup error:', gErr);
    }

    // Priority 3: Public IP-based Geolocation Fallback
    // Clearly labeled as a coarse regional estimate (never misrepresented as exact GPS)
    try {
        const res = await fetch('https://ipwho.is/', {
            headers: { Accept: 'application/json' },
        });
        if (res.ok) {
            const d = await res.json();
            if (d.success && d.latitude && d.longitude && !isDatacenterLocation(d.country, d.city, d.connection?.org)) {
                const placeName = [d.city, d.region, d.country].filter(Boolean).join(', ');
                const isp = d.connection?.isp || d.connection?.org || '';
                const isCellular = isMobileCellularISP(isp);
                const isVpn = isVpnOrProxyISP(isp);
                const connType: ConnectionType = isVpn ? 'vpn' : isCellular ? 'mobile-hotspot' : 'wifi';

                const connLabel = isVpn
                    ? 'VPN / Proxy Detected'
                    : isCellular
                        ? 'Mobile Hotspot / Cellular Gateway'
                        : 'Broadband / Wi-Fi Network';

                let statusNote = isCellular
                    ? 'Mobile hotspot detected: location reflects cellular carrier gateway. Turn on Windows Location in settings, or type exact street / drop a map pin.'
                    : isVpn
                        ? 'VPN detected: location reflects VPN server exit node. Type exact address or drop a pin on map.'
                        : 'Coarse regional estimate based on public ISP gateway. For street accuracy, search address or use map.';

                if (locationDenied) {
                    statusNote = 'Browser location permission was denied. Allow location in Chrome/Edge address bar (lock icon) to get exact street-level accuracy.';
                } else if (locationUnavailable) {
                    statusNote = 'Windows Location Services is disabled. Enable in Windows Settings → Privacy & Security → Location to lock exact coordinates.';
                }

                return {
                    latitude: Number(d.latitude),
                    longitude: Number(d.longitude),
                    name: placeName || `${d.city}, ${d.country}`,
                    city: d.city,
                    state: d.region,
                    country: d.country,
                    detectionMethod: 'ip-geolocation-estimate',
                    detectionMethodLabel: 'Public IP Geolocation (Coarse Fallback)',
                    accuracyMeters: 25000,
                    accuracyQuality: 'coarse',
                    locationQuality: 'Approximate',
                    connectionType: connType,
                    connectionTypeLabel: connLabel,
                    permissionStatus: locationDenied ? 'denied' : permStatus,
                    lastUpdated: new Date().toLocaleTimeString(),
                    isCellularHotspot: isCellular,
                    isVPNOrProxy: isVpn,
                    ispName: isp,
                    ipAddress: d.ip,
                    statusNote,
                };
            }
        }
    } catch (ipErr) {
        console.warn('ipwho.is lookup failed, trying server-side proxy:', ipErr);
    }

    // Fallback 2B: Server proxy IP lookup
    try {
        const ipRes = await fetch('/api/geocode/ip');
        if (ipRes.ok) {
            const data = await ipRes.json();
            if (data.success && data.latitude && data.longitude && !isDatacenterLocation(data.country, data.city)) {
                return {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    name: data.name || `${data.city || 'Detected Location'}, ${data.region || data.country || ''}`,
                    city: data.city,
                    state: data.region,
                    country: data.country,
                    detectionMethod: 'ip-geolocation-estimate',
                    detectionMethodLabel: 'Server IP Geolocation Fallback',
                    accuracyMeters: 30000,
                    accuracyQuality: 'coarse',
                    locationQuality: 'Approximate',
                    connectionType: 'wifi',
                    connectionTypeLabel: 'Network IP Lookup',
                    permissionStatus: permStatus,
                    lastUpdated: new Date().toLocaleTimeString(),
                    isCellularHotspot: false,
                    isVPNOrProxy: false,
                    statusNote: 'Approximate region from network IP. Use search or map for exact street positioning.',
                };
            }
        }
    } catch (proxyErr) {
        console.warn('Server proxy geocode failed:', proxyErr);
    }

    // Priority 3: Default Indian Transit Hub (Graceful Preset)
    return {
        latitude: 17.4339,
        longitude: 78.5042,
        name: 'Hyderabad Central Junction, Telangana, India',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        detectionMethod: 'default-hub',
        detectionMethodLabel: 'Default Transit Hub',
        accuracyMeters: 50000,
        accuracyQuality: 'approximate',
        locationQuality: 'Unknown',
        connectionType: 'wifi',
        connectionTypeLabel: 'Default Location',
        permissionStatus: permStatus,
        lastUpdated: new Date().toLocaleTimeString(),
        isCellularHotspot: false,
        isVPNOrProxy: false,
        statusNote: 'Windows location permissions were disabled or timed out. Please search your city or place a pin on the map.',
    };
}

/**
 * Backward compatibility alias for legacy callers
 */
export async function detectUserLocation(): Promise<LocationDiagnostics> {
    return await detectLaptopLocation();
}

/**
 * Reverse Geocode Coordinates via OpenStreetMap Nominatim
 */
export async function reverseGeocodeDetailed(lat: number, lon: number): Promise<{
    name: string;
    road?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
} | null> {
    try {
        const res = await fetch(`/api/geocode/reverse?latitude=${lat}&longitude=${lon}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                return {
                    name: data.name || data.fullName,
                    road: data.road,
                    neighbourhood: data.neighbourhood,
                    city: data.city,
                    state: data.state,
                    country: data.country,
                    postcode: data.postcode,
                };
            }
        }
    } catch (e) {
        console.warn('Reverse geocode error:', e);
    }
    return null;
}

export async function reverseGeocodeCoord(lat: number, lon: number): Promise<string | null> {
    const d = await reverseGeocodeDetailed(lat, lon);
    return d ? d.name : null;
}
