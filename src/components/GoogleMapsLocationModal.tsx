import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Crosshair,
  Layers,
  ExternalLink,
  Check,
  X,
  Navigation,
  Globe,
} from 'lucide-react';

interface GoogleMapsLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation: { name: string; latitude: number; longitude: number };
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number }) => void;
}

export const GoogleMapsLocationModal: React.FC<GoogleMapsLocationModalProps> = ({
  isOpen,
  onClose,
  initialLocation,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lng: number }>({
    lat: initialLocation.latitude,
    lng: initialLocation.longitude,
  });
  const [selectedName, setSelectedName] = useState(initialLocation.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Initialize and manage Leaflet map with Google Maps tiles
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedCoord.lat, selectedCoord.lng],
          zoom: 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        const tileUrl =
          mapType === 'satellite'
            ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

        const tileLayer = L.tileLayer(tileUrl, {
          maxZoom: 20,
          attribution: '&copy; Google Maps',
        }).addTo(map);

        tileLayerRef.current = tileLayer;

        // Custom Google Red Pin Icon
        const googlePinIcon = L.divIcon({
          className: 'google-map-pin',
          html: `
            <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%);">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="#ea4335" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([selectedCoord.lat, selectedCoord.lng], {
          icon: googlePinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', async (e) => {
          const latlng = e.target.getLatLng();
          handleUpdatePosition(latlng.lat, latlng.lng);
        });

        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          handleUpdatePosition(e.latlng.lat, e.latlng.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
        setTimeout(() => map.invalidateSize(), 200);
      } else {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  // Update tile layer when mapType changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);

    const tileUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(mapRef.current);

    tileLayerRef.current = tileLayer;
  }, [mapType]);

  // Reverse geocode when position moves
  const handleUpdatePosition = async (lat: number, lng: number) => {
    setSelectedCoord({ lat, lng });
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(`/api/geocode/reverse?latitude=${lat}&longitude=${lng}`);
      const data = await res.json();
      if (data.name) {
        setSelectedName(data.name);
      }
    } catch {
      setSelectedName(`Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Search autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success && data.locations) {
          setSuggestions(data.locations);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (loc: any) => {
    setSelectedCoord({ lat: loc.latitude, lng: loc.longitude });
    setSelectedName(loc.name || loc.fullName);
    setSearchQuery('');
    setSuggestions([]);

    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([loc.latitude, loc.longitude], 16);
      markerRef.current.setLatLng([loc.latitude, loc.longitude]);
    }
  };

  const handleCurrentDeviceLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 17);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handleUpdatePosition(latitude, longitude);
      },
      () => {
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    onSelectLocation({
      name: selectedName,
      latitude: selectedCoord.lat,
      longitude: selectedCoord.lng,
    });
    onClose();
  };

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${selectedCoord.lat},${selectedCoord.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>Google Maps Location Picker</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal">
                  Exact Street Positioning
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Search any address or drag the red Google pin directly to your exact spot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Controls Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, landmark, or paste Google Maps coordinates (e.g. 16.518, 80.619)..."
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Suggestions flyout */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left p-2.5 hover:bg-indigo-50 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{sug.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{sug.fullName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border ${
                  mapType === 'roadmap'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🗺️ Google Roadmap
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border ${
                  mapType === 'satellite'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🛰️ Google Satellite
              </button>
            </div>

            <button
              type="button"
              onClick={handleCurrentDeviceLocation}
              disabled={isDetectingGps}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-[11px] cursor-pointer transition-colors"
            >
              <Navigation className={`w-3 h-3 text-indigo-600 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Locating...' : 'Locate Me'}</span>
            </button>
          </div>
        </div>

        {/* Map View */}
        <div className="relative h-[380px] sm:h-[420px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-white text-[10.5px] px-3 py-1.5 rounded-lg shadow-md border border-white/10">
            👆 Click anywhere or drag the red pin to set exact spot
          </div>
        </div>

        {/* Selected Location Card & Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Selected Exact Position
            </span>
            <div className="font-bold text-xs text-slate-900 truncate">
              {isReverseGeocoding ? 'Resolving address...' : selectedName}
            </div>
            <div className="text-[10.5px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{selectedCoord.lat.toFixed(5)}°N, {selectedCoord.lng.toFixed(5)}°E</span>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[10px]"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Use This Exact Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

