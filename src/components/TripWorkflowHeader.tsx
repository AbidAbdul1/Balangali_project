import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ALL_REGIONS, WorldRegion } from '../data/destinations';
import { Destination } from '../types/travel';
import { detectLaptopLocation, LocationDiagnostics } from '../utils/locationService';
import { LocationDiagnosticsCard } from './LocationDiagnosticsCard';
import { GoogleMapsLocationModal } from './GoogleMapsLocationModal';
import {
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Crosshair,
  Building,
  Plane,
  Train,
  X,
  Calendar,
  Wallet,
  Plus,
  Minus,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface TripWorkflowHeaderProps {
  startingLocation: { name: string; latitude: number; longitude: number };
  onSelectStartingLocation: (loc: { name: string; latitude: number; longitude: number }) => void;
  selectedRegion: WorldRegion | null;
  onSelectRegion: (region: WorldRegion) => void;
  itemsInPlanCount: number;
  totalEstimatedCost: number;
  onOpenItinerary: () => void;
  onFocusStartingPointOnMap?: () => void;
  tripDurationDays?: number;
  onUpdateDurationDays?: (days: number) => void;
  customBudgetAmount?: number;
  onUpdateBudgetAmount?: (amt: number | undefined) => void;
  onClearItinerary?: () => void;
  onAutoFillPlan?: () => void;
  travelersCount?: number;
  onUpdateTravelersCount?: (count: number) => void;
  selectedDestinations?: Destination[];
  onRemoveDestination?: (dest: Destination) => void;
}

const QUICK_STARTING_HUBS = [
  { name: 'Vijayawada Central Junction', lat: 16.5179, lon: 80.6196, type: 'train' },
  { name: 'Hyderabad Secunderabad', lat: 17.4339, lon: 78.5042, type: 'train' },
  { name: 'Visakhapatnam Junction', lat: 17.7214, lon: 83.2926, type: 'train' },
  { name: 'Bengaluru Majestic', lat: 12.9778, lon: 77.5714, type: 'train' },
  { name: 'Chennai Central Station', lat: 13.0827, lon: 80.2707, type: 'train' },
  { name: 'Mumbai CSMT Station', lat: 18.9402, lon: 72.8356, type: 'train' },
  { name: 'New Delhi CP Hub', lat: 28.6315, lon: 77.2167, type: 'city' },
  { name: 'Kolkata Howrah', lat: 22.583, lon: 88.3426, type: 'train' },
  { name: 'Goa Madgaon Hub', lat: 15.2736, lon: 73.9582, type: 'train' },
];

export const TripWorkflowHeader: React.FC<TripWorkflowHeaderProps> = ({
  startingLocation,
  onSelectStartingLocation,
  selectedRegion,
  onSelectRegion,
  itemsInPlanCount,
  totalEstimatedCost,
  onOpenItinerary,
  onFocusStartingPointOnMap,
  tripDurationDays = 1,
  onUpdateDurationDays,
  customBudgetAmount,
  onUpdateBudgetAmount,
  onClearItinerary,
  onAutoFillPlan,
  travelersCount = 1,
  onUpdateTravelersCount,
  selectedDestinations = [],
  onRemoveDestination,
}) => {
  const { currencySymbol } = useLanguage();

  // Origin states
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [originSearchQuery, setOriginSearchQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationDiagnostics, setLocationDiagnostics] = useState<LocationDiagnostics | null>(null);
  const [isGoogleMapPickerOpen, setIsGoogleMapPickerOpen] = useState(false);

  // Destination states
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [isSearchingCustomCity, setIsSearchingCustomCity] = useState(false);

  // Start Date state for calendar-style selector
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });

  const originInputRef = useRef<HTMLInputElement>(null);
  const originFlyoutRef = useRef<HTMLDivElement>(null);
  const destFlyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingOrigin && originInputRef.current) {
      originInputRef.current.focus();
    }
  }, [isEditingOrigin]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originFlyoutRef.current && !originFlyoutRef.current.contains(event.target as Node)) {
        setIsEditingOrigin(false);
      }
      if (destFlyoutRef.current && !destFlyoutRef.current.contains(event.target as Node)) {
        setIsSelectingDestination(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!originSearchQuery.trim() || originSearchQuery.length < 2) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(originSearchQuery)}`);
        const data = await res.json();
        if (data.success && data.locations) {
          setOriginSuggestions(data.locations);
        }
      } catch (err) {
        console.error('Origin geocoding error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [originSearchQuery]);

  const handleUseCurrentGps = async () => {
    setIsLocatingGps(true);
    setGpsError(null);

    try {
      const loc = await detectLaptopLocation();
      setLocationDiagnostics(loc);

      onSelectStartingLocation({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });

      if (loc.detectionMethod === 'default-hub') {
        setGpsError(
          'Location services disabled or unavailable. You can search an exact address or place a pin on the map.'
        );
      } else if (loc.accuracyQuality === 'exact' || loc.accuracyQuality === 'high') {
        setIsEditingOrigin(false);
        if (onFocusStartingPointOnMap) {
          onFocusStartingPointOnMap();
        }
      }
    } catch (err: any) {
      console.warn('Location detection error:', err);
      setGpsError('Could not detect location automatically. Please search or pick a hub below.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  const filteredRegions = ALL_REGIONS.filter(
    (r) =>
      r.name.toLowerCase().includes(destSearchQuery.toLowerCase()) ||
      r.state.toLowerCase().includes(destSearchQuery.toLowerCase()) ||
      (r.country && r.country.toLowerCase().includes(destSearchQuery.toLowerCase()))
  );

  // Calculate Trip Readiness Progress
  const readinessSteps = [
    Boolean(startingLocation?.name),
    Boolean(selectedRegion),
    itemsInPlanCount > 0,
  ];
  const completedCount = readinessSteps.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <section
      aria-label="Trip Command Center"
      className="bg-white rounded-3xl border border-[#E8EAF2] shadow-[0_10px_35px_-10px_rgba(16,24,40,0.06)] mb-6 transition-all"
    >
      <div className="p-5 sm:p-6">
        {/* Top Command Header & Progress Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8EAF2]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101828] text-white text-[11px] font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Trip Command Center</span>
            </div>

            {/* Readiness Progress Indicator */}
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <div className="w-24 h-2 bg-[#F7F8FC] rounded-full overflow-hidden border border-[#E8EAF2]">
                <div
                  className="h-full bg-brand-gradient transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-[#101828] font-mono text-[11px]">
                {completedCount}/3 steps ready
              </span>
            </div>
          </div>

          {/* Primary Actions: Auto-Suggest, Clear, & Plan My Trip CTA */}
          <div className="flex flex-wrap items-center gap-2.5">
            {itemsInPlanCount === 0 && onAutoFillPlan && selectedRegion && (
              <button
                type="button"
                onClick={onAutoFillPlan}
                className="px-3.5 py-2 text-xs font-bold text-[#5145E5] bg-[#5145E5]/10 hover:bg-[#5145E5]/15 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#5145E5]" />
                <span>AI Auto-Fill {selectedRegion.name}</span>
              </button>
            )}

            {itemsInPlanCount > 0 && onClearItinerary && (
              <button
                type="button"
                onClick={onClearItinerary}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200/70"
              >
                Clear ({itemsInPlanCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (itemsInPlanCount === 0 && selectedRegion && onAutoFillPlan) {
                  onAutoFillPlan();
                }
                onOpenItinerary();
              }}
              className="px-5 py-2.5 bg-brand-gradient text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#5145E5]/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Plan My Trip</span>
              {itemsInPlanCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[11px]">
                  {itemsInPlanCount} {itemsInPlanCount === 1 ? 'stop' : 'stops'}
                  {totalEstimatedCost > 0
                    ? ` · ${currencySymbol}${totalEstimatedCost.toLocaleString()}`
                    : ''}
                </span>
              )}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive 5-Column Trip Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-4">
          {/* 1. Origin Selection (3 cols) */}
          <div className="lg:col-span-3 relative" ref={originFlyoutRef}>
            <div
              onClick={() => setIsEditingOrigin(!isEditingOrigin)}
              className={`h-full p-4 rounded-2xl border transition-all cursor-pointer group ${
                isEditingOrigin
                  ? 'border-[#5145E5] ring-2 ring-[#5145E5]/15 bg-white shadow-md'
                  : 'bg-[#F7F8FC] border-[#E8EAF2] hover:bg-white hover:border-[#5145E5]/40'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5 text-[#14B8A6]">
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                  <span>1. Origin</span>
                </span>
                <span className="text-[#5145E5] group-hover:underline">
                  {isEditingOrigin ? 'Close' : 'Change'}
                </span>
              </div>
              <div className="font-display font-bold text-[#101828] text-sm truncate">
                {startingLocation.name}
              </div>
              <div className="text-[11px] text-[#64748B] font-mono mt-1 truncate">
                {startingLocation.latitude.toFixed(2)}°N, {startingLocation.longitude.toFixed(2)}°E
              </div>
            </div>

            {/* Origin Flyout */}
            {isEditingOrigin && (
              <div className="absolute left-0 top-full mt-2 w-full sm:w-[420px] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-[#E8EAF2] p-4 z-50 space-y-3.5 animate-fade-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8EAF2]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#14B8A6]" />
                    <span className="text-xs font-bold text-[#101828]">
                      Select Starting Departure Hub
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingOrigin(false);
                      setGpsError(null);
                    }}
                    className="text-[#64748B] hover:text-[#101828] p-1 rounded-lg hover:bg-[#F7F8FC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsGoogleMapPickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pick Exact Spot on Google Map</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      disabled={isLocatingGps}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#F7F8FC] hover:bg-slate-200/70 text-[#101828] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 border border-[#E8EAF2]"
                    >
                      <Navigation
                        className={`w-3.5 h-3.5 text-[#5145E5] ${
                          isLocatingGps ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{isLocatingGps ? 'Detecting...' : 'Use Live GPS'}</span>
                    </button>

                    {onFocusStartingPointOnMap && (
                      <button
                        type="button"
                        onClick={() => {
                          onFocusStartingPointOnMap();
                          setIsEditingOrigin(false);
                        }}
                        className="px-3.5 py-2 bg-[#F7F8FC] hover:bg-[#5145E5]/10 hover:text-[#5145E5] text-[#101828] rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 border border-[#E8EAF2]"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-[#5145E5]" />
                        <span>Map Pin</span>
                      </button>
                    )}
                  </div>

                  {locationDiagnostics && (
                    <LocationDiagnosticsCard
                      diagnostics={locationDiagnostics}
                      onRefresh={handleUseCurrentGps}
                      isLoading={isLocatingGps}
                      onOpenMapPicker={() => setIsGoogleMapPickerOpen(true)}
                    />
                  )}
                </div>

                {gpsError && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
                    ⚠️ {gpsError}
                  </div>
                )}

                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                  <input
                    ref={originInputRef}
                    type="text"
                    value={originSearchQuery}
                    onChange={(e) => setOriginSearchQuery(e.target.value)}
                    placeholder="Search city, station, or airport..."
                    className="w-full pl-9 pr-8 py-2.5 text-xs bg-[#F7F8FC] border border-[#E8EAF2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5145E5]/20 focus:border-[#5145E5] text-[#101828]"
                  />
                  {originSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setOriginSearchQuery('');
                        setOriginSuggestions([]);
                      }}
                      className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#101828] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {originSuggestions.length > 0 && (
                  <div className="border border-[#E8EAF2] rounded-xl max-h-40 overflow-y-auto divide-y divide-[#E8EAF2] bg-white">
                    {originSuggestions.map((loc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectStartingLocation({
                            name: loc.name || loc.fullName,
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                          });
                          setIsEditingOrigin(false);
                          setOriginSearchQuery('');
                          setOriginSuggestions([]);
                        }}
                        className="w-full text-left p-2.5 hover:bg-[#F7F8FC] text-xs transition-colors cursor-pointer flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#5145E5] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-bold text-[#101828] truncate">{loc.name}</div>
                          <div className="text-[10px] text-[#64748B] truncate">{loc.fullName}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-[#E8EAF2]">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                    Popular Departure Hubs:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_STARTING_HUBS.map((hub, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectStartingLocation({
                            name: hub.name,
                            latitude: hub.lat,
                            longitude: hub.lon,
                          });
                          setIsEditingOrigin(false);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F8FC] hover:bg-[#5145E5]/10 hover:text-[#5145E5] text-[#101828] rounded-lg border border-[#E8EAF2] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {hub.type === 'plane' && <Plane className="w-3 h-3 text-sky-600" />}
                        {hub.type === 'train' && <Train className="w-3 h-3 text-[#5145E5]" />}
                        {hub.type === 'city' && <Building className="w-3 h-3 text-[#64748B]" />}
                        <span>{hub.name.split('(')[0].trim()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Destination Selection (3 cols) */}
          <div className="lg:col-span-3 relative" ref={destFlyoutRef}>
            <div
              onClick={() => setIsSelectingDestination(!isSelectingDestination)}
              className={`h-full p-4 rounded-2xl border transition-all cursor-pointer group ${
                !selectedRegion
                  ? 'border-[#5145E5]/50 bg-[#5145E5]/[0.04] ring-2 ring-[#5145E5]/15'
                  : isSelectingDestination
                  ? 'border-[#5145E5] ring-2 ring-[#5145E5]/15 bg-white shadow-md'
                  : 'bg-[#F7F8FC] border-[#E8EAF2] hover:bg-white hover:border-[#5145E5]/40'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5 text-[#5145E5]">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>2. Destination</span>
                </span>
                <span className="text-[#5145E5] group-hover:underline">
                  {!selectedRegion ? 'Select' : isSelectingDestination ? 'Close' : 'Switch'}
                </span>
              </div>

              {selectedRegion ? (
                <>
                  <div className="font-display font-bold text-[#101828] text-sm truncate flex items-center justify-between gap-2">
                    <span className="truncate">{selectedRegion.name}</span>
                    <span className="text-[10px] font-mono font-bold text-[#5145E5] bg-[#5145E5]/10 px-2 py-0.5 rounded-full shrink-0">
                      {selectedRegion.destinations.length} spots
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate mt-1">
                    {selectedRegion.state}
                    {selectedRegion.country ? `, ${selectedRegion.country}` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display font-bold text-[#101828] text-sm truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5145E5] animate-ping shrink-0" />
                    <span>Choose Destination</span>
                  </div>
                  <div className="text-[11px] text-[#5145E5] font-medium truncate mt-1">
                    Goa, Paris, Tokyo, Jaipur &amp; more
                  </div>
                </>
              )}
            </div>

            {/* Destination Flyout */}
            {isSelectingDestination && (
              <div className="absolute left-0 top-full mt-2 w-full sm:w-[420px] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-[#E8EAF2] p-4 z-50 space-y-3.5 animate-fade-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8EAF2]">
                  <span className="text-xs font-bold text-[#101828]">
                    Select Destination City or Region
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSelectingDestination(false)}
                    className="text-[#64748B] hover:text-[#101828] p-1 rounded-lg hover:bg-[#F7F8FC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={destSearchQuery}
                    onChange={(e) => setDestSearchQuery(e.target.value)}
                    placeholder="Search city (Goa, Jaipur, Paris, Mumbai, Tokyo)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8FC] border border-[#E8EAF2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5145E5]/20 focus:border-[#5145E5] text-[#101828]"
                  />
                </div>

                {destSearchQuery.trim() && (
                  <div className="p-3 bg-[#5145E5]/5 border border-[#5145E5]/20 rounded-2xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#101828] truncate">
                        Discover &ldquo;{destSearchQuery}&rdquo;
                      </div>
                      <div className="text-[10px] text-[#5145E5]">
                        Synthesize authentic attractions with Gemini AI
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSearchingCustomCity}
                      onClick={async () => {
                        setIsSearchingCustomCity(true);
                        try {
                          const geoRes = await fetch(
                            `/api/geocode?q=${encodeURIComponent(destSearchQuery)}`
                          );
                          const geoData = await geoRes.json();
                          const topGeo = geoData?.locations?.[0];
                          const lat = topGeo ? topGeo.latitude : 15.4989;
                          const lon = topGeo ? topGeo.longitude : 73.8278;

                          const aiRes = await fetch('/api/destinations/ai-search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              query: destSearchQuery,
                              latitude: lat,
                              longitude: lon,
                            }),
                          });
                          const aiData = await aiRes.json();
                          const dests = aiData.destinations || [];

                          const customRegion: WorldRegion = {
                            id: `custom-${destSearchQuery.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                            name: topGeo?.name || destSearchQuery,
                            state: topGeo?.fullName?.split(',')[1]?.trim() || 'Custom Hub',
                            country: topGeo?.fullName?.split(',').slice(-1)[0]?.trim() || '',
                            latitude: lat,
                            longitude: lon,
                            tagline: `AI-Synthesized Travel Circuit for ${destSearchQuery}`,
                            defaultOriginName: `${destSearchQuery} Central Hub`,
                            corridors: [],
                            destinations: dests,
                          };

                          onSelectRegion(customRegion);
                          setIsSelectingDestination(false);
                          setDestSearchQuery('');
                        } catch (e) {
                          console.error('Custom city AI discovery error:', e);
                        } finally {
                          setIsSearchingCustomCity(false);
                        }
                      }}
                      className="px-3.5 py-2 bg-brand-gradient text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSearchingCustomCity ? 'Searching...' : 'Explore via AI'}</span>
                    </button>
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto divide-y divide-[#E8EAF2] border border-[#E8EAF2] rounded-2xl">
                  {filteredRegions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => {
                        onSelectRegion(region);
                        setIsSelectingDestination(false);
                        setDestSearchQuery('');
                      }}
                      className={`w-full text-left p-3 hover:bg-[#F7F8FC] text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        selectedRegion?.id === region.id
                          ? 'bg-[#5145E5]/10 font-bold text-[#101828]'
                          : 'text-[#101828]'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{region.name}</div>
                        <div className="text-[10px] text-[#64748B]">
                          {region.state}
                          {region.country ? `, ${region.country}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#5145E5] bg-[#5145E5]/10 px-2 py-0.5 rounded-full font-bold">
                        {region.destinations.length} spots
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Travel Dates & Duration Selector (3 cols) */}
          <div className="lg:col-span-3 p-4 rounded-2xl border border-[#E8EAF2] bg-[#F7F8FC] hover:bg-white hover:border-[#5145E5]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5 text-[#101828]">
                <Calendar className="w-3.5 h-3.5 text-[#5145E5]" />
                <span>3. Dates &amp; Duration</span>
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Trip Start Date"
                className="text-[11px] font-mono font-bold text-[#5145E5] bg-white border border-[#E8EAF2] rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#5145E5] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-2 my-1">
              <div className="font-display font-bold text-[#101828] text-sm">
                {tripDurationDays} {tripDurationDays === 1 ? 'Day' : 'Days'}
              </div>

              {/* Quick Duration Pills + Stepper */}
              <div className="flex items-center gap-1">
                {[1, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdateDurationDays && onUpdateDurationDays(d)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all ${
                      tripDurationDays === d
                        ? 'bg-[#101828] text-white'
                        : 'bg-white text-[#64748B] border border-[#E8EAF2] hover:text-[#101828]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDurationDays &&
                    onUpdateDurationDays(Math.max(1, (tripDurationDays || 1) - 1))
                  }
                  className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 text-[#101828] rounded-lg border border-[#E8EAF2] cursor-pointer"
                  title="Decrease days"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDurationDays &&
                    onUpdateDurationDays(Math.min(30, (tripDurationDays || 1) + 1))
                  }
                  className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 text-[#101828] rounded-lg border border-[#E8EAF2] cursor-pointer"
                  title="Increase days"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Travelers / Group Count Control */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#E8EAF2] text-[11px]">
              <span className="text-[#64748B] font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-[#14B8A6]" />
                <span>Travelers:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTravelersCount &&
                    onUpdateTravelersCount(Math.max(1, travelersCount - 1))
                  }
                  className="w-5 h-5 rounded-md bg-white border border-[#E8EAF2] flex items-center justify-center text-[#101828] hover:bg-slate-100 cursor-pointer"
                  aria-label="Decrease travelers"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="font-mono font-bold text-[#101828] min-w-[3.2rem] text-center">
                  {travelersCount} {travelersCount === 1 ? 'guest' : 'guests'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTravelersCount &&
                    onUpdateTravelersCount(Math.min(20, travelersCount + 1))
                  }
                  className="w-5 h-5 rounded-md bg-white border border-[#E8EAF2] flex items-center justify-center text-[#101828] hover:bg-slate-100 cursor-pointer"
                  aria-label="Increase travelers"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Interactive Budget Slider & Presets (3 cols) */}
          <div className="lg:col-span-3 p-4 rounded-2xl border border-[#E8EAF2] bg-[#F7F8FC] hover:bg-white hover:border-[#5145E5]/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-[#101828]">
                <Wallet className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>4. Budget Control</span>
              </span>
              <span className="font-mono font-bold text-[#5145E5]">
                {customBudgetAmount
                  ? `${currencySymbol}${customBudgetAmount.toLocaleString()}`
                  : 'Flexible'}
              </span>
            </div>

            {/* Interactive Range Slider */}
            <div className="my-1.5">
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={customBudgetAmount ?? 15000}
                onChange={(e) =>
                  onUpdateBudgetAmount && onUpdateBudgetAmount(Number(e.target.value))
                }
                aria-label="Target Budget Slider"
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5145E5]"
              />
            </div>

            {/* Preset Budget Pills + Custom Input */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                {[3000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onUpdateBudgetAmount && onUpdateBudgetAmount(amt)}
                    className={`px-2 py-1 text-[10px] font-mono rounded-lg transition-all cursor-pointer ${
                      customBudgetAmount === amt
                        ? 'bg-[#101828] text-white font-bold shadow-2xs'
                        : 'bg-white text-[#64748B] hover:text-[#101828] border border-[#E8EAF2]'
                    }`}
                  >
                    {amt / 1000}k
                  </button>
                ))}
              </div>

              <div className="relative w-24">
                <span className="absolute left-2 top-1 text-[11px] font-bold text-[#64748B] font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={customBudgetAmount ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                    if (onUpdateBudgetAmount) onUpdateBudgetAmount(val);
                  }}
                  placeholder="Custom"
                  className="w-full pl-5 pr-1.5 py-1 text-[11px] font-bold font-mono text-[#101828] bg-white border border-[#E8EAF2] rounded-lg focus:outline-none focus:border-[#5145E5]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Destinations Removable Chips Strip */}
        {selectedDestinations.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#E8EAF2] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span>Selected Places ({selectedDestinations.length}):</span>
            </span>
            {selectedDestinations.map((dest) => (
              <span
                key={dest.id}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-[#F7F8FC] border border-[#E8EAF2] text-xs font-semibold text-[#101828] shadow-2xs"
              >
                <span className="truncate max-w-[160px]">{dest.name}</span>
                {onRemoveDestination && (
                  <button
                    type="button"
                    onClick={() => onRemoveDestination(dest)}
                    title={`Remove ${dest.name} from trip`}
                    className="w-4 h-4 rounded-full hover:bg-rose-100 hover:text-rose-600 text-[#64748B] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Google Maps Location Picker Modal */}
      <GoogleMapsLocationModal
        isOpen={isGoogleMapPickerOpen}
        onClose={() => setIsGoogleMapPickerOpen(false)}
        initialLocation={startingLocation}
        onSelectLocation={(loc) => {
          onSelectStartingLocation(loc);
          setIsEditingOrigin(false);
        }}
      />
    </section>
  );
};
