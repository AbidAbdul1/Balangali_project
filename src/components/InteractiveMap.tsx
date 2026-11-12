import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Destination, RouteCalculationResult } from '../types/travel';
import { loadGoogleMapsScript } from '../services/googleMapsLoader';
import {
  Navigation,
  Maximize2,
  LocateFixed,
  MapPin,
  Route,
  Crosshair,
  Check,
  Compass,
  Layers,
  Star,
  ExternalLink,
} from 'lucide-react';

interface InteractiveMapProps {
  destinations: Destination[];
  selectedDestination?: Destination | null;
  onSelectDestination: (dest: Destination) => void;
  activeRoute?: RouteCalculationResult | null;
  originLocation: { name: string; latitude: number; longitude: number };
  onAddToItinerary?: (dest: Destination) => void;
  onSetUserLocation?: (loc: { name: string; latitude: number; longitude: number; isCurrentLocation?: boolean }) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  destinations,
  selectedDestination,
  onSelectDestination,
  activeRoute,
  originLocation,
  onAddToItinerary,
  onSetUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isClickToSetStartMode, setIsClickToSetStartMode] = useState(false);
  const [mapStatusMessage, setMapStatusMessage] = useState<string | null>(null);

  // 1. Initialize Google Maps JavaScript API
  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsScript()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!googleMapRef.current) {
          const map = new googleMaps.Map(mapContainerRef.current, {
            center: { lat: originLocation.latitude, lng: originLocation.longitude },
            zoom: 13,
            mapTypeId: googleMaps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: googleMaps.ControlPosition.RIGHT_TOP,
            },
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels.text',
                stylers: [{ visibility: 'on' }],
              },
            ],
          });

          // Map click handler to select/drop starting location
          map.addListener('click', async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            if (onSetUserLocation) {
              try {
                const resp = await fetch(`/api/geocode/reverse?latitude=${lat}&longitude=${lng}`);
                const data = await resp.json();
                const placeName = data.name || `Custom Starting Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

                onSetUserLocation({
                  name: placeName,
                  latitude: lat,
                  longitude: lng,
                  isCurrentLocation: false,
                });
                setMapStatusMessage(`📍 Starting point set to: ${placeName.split(',')[0]}`);
                setTimeout(() => setMapStatusMessage(null), 4000);
              } catch {
                onSetUserLocation({
                  name: `Starting Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                  latitude: lat,
                  longitude: lng,
                  isCurrentLocation: false,
                });
              }
            }
          });

          infoWindowRef.current = new googleMaps.InfoWindow();
          googleMapRef.current = map;
          setIsGoogleMapsReady(true);
        }
      })
      .catch((err) => {
        console.warn('Google Maps JS API load failed, using fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Toggle Roadmap / Satellite Map Type
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;
    googleMapRef.current.setMapTypeId(
      mapTypeId === 'satellite' ? gmaps.MapTypeId.SATELLITE : gmaps.MapTypeId.ROADMAP
    );
  }, [mapTypeId]);

  // 2b. Toggle Live Google Maps Traffic Layer
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new gmaps.TrafficLayer();
    }
    trafficLayerRef.current?.setMap(showTrafficLayer ? googleMapRef.current : null);
  }, [showTrafficLayer, isGoogleMapsReady]);

  // 3. Render or Update Draggable Starting Location Origin Marker
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    const originPos = { lat: originLocation.latitude, lng: originLocation.longitude };

    if (!originMarkerRef.current) {
      // Create starting origin marker (draggable)
      const marker = new gmaps.Marker({
        position: originPos,
        map: googleMapRef.current,
        title: `Start: ${originLocation.name}`,
        draggable: true,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        zIndex: 999,
      });

      marker.addListener('dragend', async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        if (onSetUserLocation) {
          try {
            const resp = await fetch(`/api/geocode/reverse?latitude=${lat}&longitude=${lng}`);
            const data = await resp.json();
            const placeName = data.name || `Starting Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            onSetUserLocation({
              name: placeName,
              latitude: lat,
              longitude: lng,
              isCurrentLocation: false,
            });
            setMapStatusMessage(`📍 Moved starting point to: ${placeName.split(',')[0]}`);
            setTimeout(() => setMapStatusMessage(null), 4000);
          } catch {
            onSetUserLocation({
              name: `Starting Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              latitude: lat,
              longitude: lng,
              isCurrentLocation: false,
            });
          }
        }
      });

      originMarkerRef.current = marker;
    } else {
      originMarkerRef.current.setPosition(originPos);
      originMarkerRef.current.setTitle(`Start: ${originLocation.name}`);
    }
  }, [originLocation, isGoogleMapsReady, onSetUserLocation]);

  // 4. Render Destination Markers & Info Windows
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    // Clear previous destination markers
    destinationMarkersRef.current.forEach((m) => m.setMap(null));
    destinationMarkersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const isSelected = selectedDestination?.id === dest.id;

      const marker = new gmaps.Marker({
        position: { lat: dest.latitude, lng: dest.longitude },
        map: googleMapRef.current,
        title: dest.name,
        icon: {
          path: isSelected ? gmaps.SymbolPath.BACKWARD_CLOSED_ARROW : gmaps.SymbolPath.CIRCLE,
          scale: isSelected ? 7 : 5,
          fillColor: isSelected ? '#ea4335' : '#4f46e5',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: isSelected ? 500 : 100,
      });

      marker.addListener('click', () => {
        onSelectDestination(dest);

        // Open InfoWindow
        if (infoWindowRef.current && googleMapRef.current) {
          const infoContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px; max-width: 240px;">
              <div style="font-size: 10px; font-weight: 700; color: #4f46e5; text-transform: uppercase;">${dest.category}</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${dest.name}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.3;">${dest.shortDescription || dest.address}</div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 11px; font-weight: 600;">
                <span style="color: #b45309;">★ ${dest.rating || 4.5}</span>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name)}" target="_blank" style="color: #4f46e5; text-decoration: none;">Directions &rarr;</a>
              </div>
            </div>
          `;
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(googleMapRef.current, marker);
        }
      });

      newMarkers.push(marker);
    });

    destinationMarkersRef.current = newMarkers;
  }, [destinations, selectedDestination, isGoogleMapsReady, onSelectDestination]);

  // 5. Render Route Polyline
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (activeRoute && activeRoute.routeGeometry && activeRoute.routeGeometry.length > 0) {
      const path = activeRoute.routeGeometry.map(([lat, lng]) => ({ lat, lng }));
      const congestionColor =
        activeRoute.travelMode === 'flight'
          ? '#4f46e5'
          : activeRoute.trafficCongestionLevel === 'Severe'
          ? '#dc2626'
          : activeRoute.trafficCongestionLevel === 'Heavy'
          ? '#ea580c'
          : activeRoute.trafficCongestionLevel === 'Moderate'
          ? '#d97706'
          : '#16a34a';

      const polyline = new gmaps.Polyline({
        path,
        geodesic: true,
        strokeColor: congestionColor,
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map: googleMapRef.current,
      });

      polylineRef.current = polyline;
    }
  }, [activeRoute, isGoogleMapsReady]);

  // 6. Auto-fit Map Bounds to Trip Markers
  const handleFitRouteOrAll = useCallback(() => {
    if (!googleMapRef.current || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    const bounds = new gmaps.LatLngBounds();
    bounds.extend({ lat: originLocation.latitude, lng: originLocation.longitude });

    destinations.forEach((d) => {
      if (d.latitude && d.longitude) {
        bounds.extend({ lat: d.latitude, lng: d.longitude });
      }
    });

    if (activeRoute?.routeGeometry) {
      activeRoute.routeGeometry.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
      });
    }

    googleMapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, [originLocation, destinations, activeRoute]);

  // Focus starting point
  const handleCenterOnOrigin = () => {
    if (!googleMapRef.current) return;
    googleMapRef.current.panTo({ lat: originLocation.latitude, lng: originLocation.longitude });
    googleMapRef.current.setZoom(15);
  };

  // Locate user device via GPS
  const handleMapLocateMe = async () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        if (googleMapRef.current) {
          googleMapRef.current.panTo({ lat: latitude, lng: longitude });
          googleMapRef.current.setZoom(16);
        }
        if (onSetUserLocation) {
          try {
            const resp = await fetch(`/api/geocode/reverse?latitude=${latitude}&longitude=${longitude}`);
            const data = await resp.json();
            onSetUserLocation({
              name: data.name || `My Device (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              latitude,
              longitude,
              isCurrentLocation: true,
            });
          } catch {
            onSetUserLocation({
              name: `My Device (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              latitude,
              longitude,
              isCurrentLocation: true,
            });
          }
        }
      },
      () => {
        setIsLocating(false);
        setMapStatusMessage('⚠️ Location permission denied in browser.');
        setTimeout(() => setMapStatusMessage(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-10" />

      {/* Top Left Floating Bar: Instant Location & View Controls */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[340px]">
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-1">
          {/* 1. Center on Starting Point Button */}
          <button
            onClick={handleCenterOnOrigin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Focus and zoom right into your Starting Position"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            <span>Start Pin</span>
          </button>

          <span className="w-px h-4 bg-slate-200" />

          {/* 2. Locate Device GPS */}
          <button
            onClick={handleMapLocateMe}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isLocating
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title="Locate my physical device via GPS"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'GPS Me'}</span>
          </button>

          <span className="w-px h-4 bg-slate-200" />

          {/* 3. Fit Route / All Markers */}
          <button
            onClick={handleFitRouteOrAll}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Fit Entire Journey Route"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
          </button>

          <span className="w-px h-4 bg-slate-200" />

          {/* 4. Google Roadmap / Satellite Toggle */}
          <button
            onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'satellite' : 'roadmap')}
            className="px-2 py-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-[10.5px] font-bold flex items-center gap-1"
            title={mapTypeId === 'roadmap' ? 'Switch to Satellite View' : 'Switch to Roadmap View'}
          >
            <span>{mapTypeId === 'roadmap' ? '🛰️ Satellite' : '🗺️ Map'}</span>
          </button>

          <span className="w-px h-4 bg-slate-200" />

          {/* 5. Live Traffic Layer Toggle */}
          <button
            onClick={() => setShowTrafficLayer((v) => !v)}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10.5px] font-bold flex items-center gap-1 ${
              showTrafficLayer
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Live Google Maps Traffic Overlay"
          >
            <span>🚦 Traffic</span>
          </button>
        </div>

        {/* Tap Map Hint Badge */}
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs text-[11px] text-slate-700 font-medium flex items-center gap-1.5 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Click map or drag green pin to move Start Location</span>
        </div>

        {/* Status Toast */}
        {mapStatusMessage && (
          <div className="bg-slate-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-md animate-in fade-in duration-200">
            {mapStatusMessage}
          </div>
        )}
      </div>

      {/* Starting Position Status Chip at Top Right */}
      <div className="absolute top-3 right-14 z-20 hidden sm:block">
        <button
          onClick={handleCenterOnOrigin}
          className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs flex items-center gap-2 hover:border-indigo-400 transition-colors cursor-pointer text-left max-w-xs"
          title="Click to jump to your Starting Position on map"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Position</span>
            <span className="font-bold text-slate-800 text-xs truncate block">{originLocation.name}</span>
          </div>
        </button>
      </div>
      {/* Live Traffic Analysis Legend (Bottom Left) */}
      {(showTrafficLayer || activeRoute) && (
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2.5 text-[10.5px]">
          {activeRoute && (
            <span className="font-bold text-slate-900">
              Route Traffic:{' '}
              <span
                className={
                  activeRoute.trafficCongestionLevel === 'Severe' || activeRoute.trafficCongestionLevel === 'Heavy'
                    ? 'text-rose-600'
                    : activeRoute.trafficCongestionLevel === 'Moderate'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }
              >
                {activeRoute.trafficCongestionLevel}
              </span>
              {activeRoute.trafficDelayMin > 0 ? ` (+${activeRoute.trafficDelayMin}m delay)` : ' (On time)'}
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Fast
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Moderate
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" /> Heavy
          </span>
        </div>
      )}
    </div>
  );
};
