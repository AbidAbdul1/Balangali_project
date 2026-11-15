import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Wallet,
  Compass,
  Navigation,
  Search,
  Sparkles,
  Trash2,
  X,
  ChevronDown,
  Map as MapIcon,
  LocateFixed,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ALL_REGIONS, WorldRegion } from '../data/destinations';
import { Destination } from '../types/travel';
import { detectLaptopLocation, LocationDiagnostics } from '../utils/locationService';
import { LocationDiagnosticsCard } from './LocationDiagnosticsCard';
import { GoogleMapsLocationModal } from './GoogleMapsLocationModal';

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
  { name: 'Vijayawada Central Junction', lat: 16.5179, lon: 80.6196 },
  { name: 'Hyderabad Secunderabad', lat: 17.4339, lon: 78.5042 },
  { name: 'Visakhapatnam Junction', lat: 17.7214, lon: 83.2926 },
  { name: 'Bengaluru Majestic', lat: 12.9778, lon: 77.5714 },
  { name: 'Chennai Central', lat: 13.0827, lon: 80.2707 },
  { name: 'New Delhi Station', lat: 28.6429, lon: 77.2191 },
  { name: 'Mumbai CSMT', lat: 18.9398, lon: 72.8355 },
  { name: 'London Central', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris Central', lat: 48.8566, lon: 2.3522 },
  { name: 'Tokyo Station', lat: 35.6812, lon: 139.7671 },
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
  tripDurationDays = 2,
  onUpdateDurationDays,
  customBudgetAmount,
  onUpdateBudgetAmount,
  onClearItinerary,
  onAutoFillPlan,
  travelersCount = 2,
  onUpdateTravelersCount,
  selectedDestinations = [],
  onRemoveDestination,
}) => {
  const { currencySymbol } = useLanguage();

  const [travelDate, setTravelDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const [openDropdown, setOpenDropdown] = useState<'origin' | 'destination' | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LocationDiagnostics | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [showDetailsStrip, setShowDetailsStrip] = useState(false);

  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const q = originQuery.trim();
    if (q.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.locations)) {
          setOriginSuggestions(data.locations.slice(0, 6));
        }
      } catch {
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [originQuery]);

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const result = await detectLaptopLocation();
      setDiagnostics(result);
      onSelectStartingLocation({
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setOpenDropdown(null);
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleCustomDestinationSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = destQuery.trim();
    if (!q) return;

    const existing = ALL_REGIONS.find(
      (r) => r.name.toLowerCase() === q.toLowerCase() || r.id === q.toLowerCase()
    );
    if (existing) {
      onSelectRegion(existing);
      setOpenDropdown(null);
      setDestQuery('');
      return;
    }

    setIsSearchingDest(true);
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const geoData = await geoRes.json();
      const topGeo = geoData?.locations?.[0];
      const lat = topGeo ? Number(topGeo.latitude) : 16.5062;
      const lon = topGeo ? Number(topGeo.longitude) : 80.648;
      const resolvedName = topGeo?.name || q;
      const country = topGeo?.country || 'Worldwide';

      const customRegion: WorldRegion = {
        id: q.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: resolvedName,
        state: topGeo?.state || country,
        country,
        isInternational: country.toLowerCase() !== 'india',
        latitude: lat,
        longitude: lon,
        tagline: `Curated highlights around ${resolvedName}`,
        defaultOriginName: `${resolvedName} Central`,
        corridors: [],
        destinations: [],
      };
      onSelectRegion(customRegion);
      setOpenDropdown(null);
      setDestQuery('');
    } finally {
      setIsSearchingDest(false);
    }
  };

  const filteredRegions = destQuery.trim()
    ? ALL_REGIONS.filter(
        (r) =>
          r.name.toLowerCase().includes(destQuery.trim().toLowerCase()) ||
          (r.country || r.state).toLowerCase().includes(destQuery.trim().toLowerCase())
      )
    : ALL_REGIONS;

  const handlePrimaryPlanClick = () => {
    if (itemsInPlanCount > 0) {
      onOpenItinerary();
    } else if (onAutoFillPlan) {
      onAutoFillPlan();
    } else {
      onOpenItinerary();
    }
  };

  const shortOrigin = startingLocation.name.split(',')[0].split('(')[0].trim();

  return (
    <section ref={barRef} className="bg-[#F7F5EF] border-b border-[#E6E2D8] no-print">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-4">
        {/* Single Clean Horizontal Planning Bar */}
        <div className="relative bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.35fr_1.35fr_0.95fr_0.7fr_0.75fr_0.9fr_auto] divide-y md:divide-y-0 md:divide-x divide-[#E6E2D8]">
            {/* 1. Starting Point */}
            <div className="relative px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'origin' ? null : 'origin'))}
                className="w-full text-left focus:outline-none group"
              >
                <span className="block text-[11px] font-medium text-[#858B84] mb-0.5">
                  Where are you starting?
                </span>
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-[#343A36] truncate">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Navigation className="w-3.5 h-3.5 text-[#243C32] shrink-0" />
                    <span className="truncate">{shortOrigin}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#858B84] shrink-0" />
                </span>
              </button>

              {openDropdown === 'origin' && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl shadow-xl p-3 z-50 space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#858B84] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={originQuery}
                      onChange={(e) => setOriginQuery(e.target.value)}
                      placeholder="Search starting city or station..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={isDetectingGps}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F5EF] hover:bg-[#EFECE4] text-xs font-medium text-[#243C32]"
                    >
                      <LocateFixed className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                      <span>{isDetectingGps ? 'Detecting...' : 'Current GPS'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        setIsMapPickerOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F5EF] hover:bg-[#EFECE4] text-xs font-medium text-[#343A36]"
                    >
                      <MapIcon className="w-3.5 h-3.5 text-[#D68B65]" />
                      <span>Pick on map</span>
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-[#F1EDE4]">
                    {isSearchingOrigin && (
                      <p className="py-2 text-xs text-[#858B84]">Searching places...</p>
                    )}
                    {originSuggestions.length > 0
                      ? originSuggestions.map((loc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              onSelectStartingLocation({
                                name: loc.name,
                                latitude: Number(loc.latitude),
                                longitude: Number(loc.longitude),
                              });
                              setOpenDropdown(null);
                              setOriginQuery('');
                            }}
                            className="w-full text-left py-2 px-1.5 hover:bg-[#F7F5EF] rounded-lg text-xs text-[#343A36]"
                          >
                            {loc.name}
                          </button>
                        ))
                      : QUICK_STARTING_HUBS.map((hub) => (
                          <button
                            key={hub.name}
                            type="button"
                            onClick={() => {
                              onSelectStartingLocation({
                                name: hub.name,
                                latitude: hub.lat,
                                longitude: hub.lon,
                              });
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left py-2 px-1.5 hover:bg-[#F7F5EF] rounded-lg text-xs text-[#343A36] flex items-center justify-between"
                          >
                            <span>{hub.name}</span>
                            <span className="text-[11px] text-[#858B84]">Hub</span>
                          </button>
                        ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Destination */}
            <div className="relative px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'destination' ? null : 'destination'))}
                className="w-full text-left focus:outline-none"
              >
                <span className="block text-[11px] font-medium text-[#858B84] mb-0.5">
                  Where do you want to go?
                </span>
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-[#343A36] truncate">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#D68B65] shrink-0" />
                    <span className="truncate">
                      {selectedRegion ? selectedRegion.name : 'Choose destination'}
                    </span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#858B84] shrink-0" />
                </span>
              </button>

              {openDropdown === 'destination' && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl shadow-xl p-3 z-50 space-y-2.5">
                  <form onSubmit={handleCustomDestinationSelect} className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-[#858B84] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={destQuery}
                        onChange={(e) => setDestQuery(e.target.value)}
                        placeholder="Type any city or region..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
                        autoFocus
                      />
                    </div>
                    {destQuery.trim() && (
                      <button
                        type="submit"
                        disabled={isSearchingDest}
                        className="px-3 py-2 rounded-xl bg-[#243C32] text-[#FFFFFF] text-xs font-medium shrink-0"
                      >
                        {isSearchingDest ? '...' : 'Go'}
                      </button>
                    )}
                  </form>

                  <div className="max-h-56 overflow-y-auto divide-y divide-[#F1EDE4]">
                    {filteredRegions.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => {
                          onSelectRegion(region);
                          setOpenDropdown(null);
                          setDestQuery('');
                        }}
                        className="w-full text-left py-2 px-1.5 hover:bg-[#F7F5EF] rounded-lg flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-medium text-[#343A36]">{region.name}</span>
                        <span className="text-[11px] text-[#858B84]">{region.country || region.state}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Travel Date */}
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-[#858B84] mb-0.5" htmlFor="nj-travel-date">
                When are you travelling?
              </label>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#858B84] shrink-0" />
                <input
                  id="nj-travel-date"
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[#343A36] focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Duration Days */}
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-[#858B84] mb-0.5" htmlFor="nj-trip-days">
                How many days?
              </label>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#858B84] shrink-0" />
                <select
                  id="nj-trip-days"
                  value={tripDurationDays}
                  onChange={(e) => onUpdateDurationDays?.(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-medium text-[#343A36] focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'day' : 'days'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Travellers */}
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-[#858B84] mb-0.5" htmlFor="nj-travellers">
                How many travellers?
              </label>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#858B84] shrink-0" />
                <select
                  id="nj-travellers"
                  value={travelersCount}
                  onChange={(e) => onUpdateTravelersCount?.(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-medium text-[#343A36] focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'traveller' : 'travellers'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6. Budget */}
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-[#858B84] mb-0.5" htmlFor="nj-budget">
                What&apos;s your budget?
              </label>
              <div className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#858B84] shrink-0 mr-0.5" />
                <span className="text-sm font-medium text-[#858B84]">{currencySymbol}</span>
                <input
                  id="nj-budget"
                  type="number"
                  min={0}
                  step={500}
                  placeholder="Flexible"
                  value={customBudgetAmount ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    onUpdateBudgetAmount?.(val ? Math.max(0, Number(val)) : undefined);
                  }}
                  className="w-full bg-transparent text-sm font-medium text-[#343A36] placeholder-[#858B84] focus:outline-none"
                />
              </div>
            </div>

            {/* Primary CTA */}
            <div className="p-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handlePrimaryPlanClick}
                className="w-full xl:w-auto px-6 py-3 rounded-xl bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium transition-colors whitespace-nowrap"
              >
                {itemsInPlanCount > 0 ? `Plan my trip (${itemsInPlanCount})` : 'Plan my trip'}
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Utility Footer Strip */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#858B84]">
          <div className="flex flex-wrap items-center gap-4">
            {itemsInPlanCount > 0 ? (
              <span className="text-[#343A36]">
                <strong className="font-semibold text-[#243C32]">{itemsInPlanCount}</strong>{' '}
                {itemsInPlanCount === 1 ? 'stop' : 'stops'} planned
                {totalEstimatedCost > 0 && (
                  <>
                    {' '}
                    · Est. <span className="font-medium text-[#343A36]">{currencySymbol}{totalEstimatedCost.toLocaleString()}</span>
                  </>
                )}
              </span>
            ) : (
              <span>Select a destination or click Plan my trip to build an open route.</span>
            )}

            {selectedDestinations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDetailsStrip((v) => !v)}
                className="inline-flex items-center gap-1 text-[#243C32] font-medium hover:underline"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{showDetailsStrip ? 'Hide selected stops' : 'View selected stops'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {onFocusStartingPointOnMap && (
              <button
                type="button"
                onClick={onFocusStartingPointOnMap}
                className="hover:text-[#343A36] transition-colors"
              >
                Focus origin on map
              </button>
            )}
            {onAutoFillPlan && (
              <button
                type="button"
                onClick={onAutoFillPlan}
                className="inline-flex items-center gap-1 text-[#243C32] font-medium hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-fill route</span>
              </button>
            )}
            {itemsInPlanCount > 0 && onClearItinerary && (
              <button
                type="button"
                onClick={onClearItinerary}
                className="inline-flex items-center gap-1 text-[#858B84] hover:text-[#D68B65] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset plan</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Selected Stops & Optional GPS Diagnostics */}
        {showDetailsStrip && selectedDestinations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#E6E2D8] flex flex-wrap items-center gap-2">
            {selectedDestinations.map((dest) => (
              <span
                key={dest.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-xs text-[#343A36]"
              >
                <span>{dest.name}</span>
                {onRemoveDestination && (
                  <button
                    type="button"
                    onClick={() => onRemoveDestination(dest)}
                    aria-label={`Remove ${dest.name}`}
                    className="text-[#858B84] hover:text-[#343A36]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {diagnostics && (
          <div className="mt-3">
            <LocationDiagnosticsCard
              diagnostics={diagnostics}
              onRefresh={handleDetectGps}
              isLoading={isDetectingGps}
              onOpenMapPicker={() => setIsMapPickerOpen(true)}
            />
          </div>
        )}
      </div>

      <GoogleMapsLocationModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLocation={startingLocation}
        onSelectLocation={(loc) => {
          onSelectStartingLocation(loc);
          setIsMapPickerOpen(false);
        }}
      />
    </section>
  );
};

export default TripWorkflowHeader;
