import React, { useState } from 'react';
import { UserPreference, ScoringWeights } from '../types/travel';
import { VIJAYAWADA_ORIGIN } from '../data/destinations';
import { useLanguage } from '../context/LanguageContext';
import { detectUserLocation } from '../utils/locationService';
import {
  Sliders,
  Clock,
  MapPin,
  IndianRupee,
  Sparkles,
  RefreshCw,
  LocateFixed,
  Search,
  Globe,
  ChevronDown,
  Check,
  Calendar,
  Plus,
  Minus,
  Wallet,
} from 'lucide-react';

interface PreferenceFormProps {
  preferences: UserPreference;
  onUpdatePreferences: (prefs: UserPreference) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const WORLDWIDE_PRESET_ORIGINS = [
  {
    name: 'Vijayawada Central Junction (Besant Rd / Station), India',
    latitude: 16.5161,
    longitude: 80.6200,
  },
  {
    name: 'Paris Central / Châtelet, France',
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    name: 'Tokyo Station / Marunouchi, Japan',
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    name: 'London Trafalgar Square / West End, UK',
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    name: 'Times Square / Midtown Manhattan, NYC',
    latitude: 40.7128,
    longitude: -74.0060,
  },
  {
    name: 'Downtown Dubai / Burj Khalifa, UAE',
    latitude: 25.2048,
    longitude: 55.2708,
  },
  {
    name: 'Roma Termini / Central Rome, Italy',
    latitude: 41.9028,
    longitude: 12.4964,
  },
  {
    name: 'Marina Bay / Downtown Singapore',
    latitude: 1.3521,
    longitude: 103.8198,
  },
  {
    name: 'Circular Quay / Sydney Harbour, Australia',
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    name: 'Hyderabad Central (Charminar & Hitec City), India',
    latitude: 17.3850,
    longitude: 78.4867,
  },
  {
    name: 'Connaught Place / Central Delhi, India',
    latitude: 28.6315,
    longitude: 77.2167,
  },
  {
    name: 'Colaba / Gateway of India, Mumbai, India',
    latitude: 18.9220,
    longitude: 72.8347,
  },
];

const AVAILABLE_INTERESTS = [
  { id: 'heritage', label: 'Heritage & Temples' },
  { id: 'caves', label: 'Caves & Monoliths' },
  { id: 'nature', label: 'River & Islands' },
  { id: 'culture', label: 'Museums & Art' },
  { id: 'food', label: 'Local Food & Bazaars' },
  { id: 'family', label: 'Parks & Families' },
];

export const PreferenceForm: React.FC<PreferenceFormProps> = ({
  preferences,
  onUpdatePreferences,
  onSubmit,
  isLoading,
}) => {
  const { t, currencySymbol } = useLanguage();
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  const toggleInterest = (interestId: string) => {
    const exists = preferences.interests.includes(interestId);
    const updated = exists
      ? preferences.interests.filter((i) => i !== interestId)
      : [...preferences.interests, interestId];
    onUpdatePreferences({ ...preferences, interests: updated });
  };

  const handleOriginChange = (index: number) => {
    const selected = WORLDWIDE_PRESET_ORIGINS[index];
    if (selected) {
      onUpdatePreferences({
        ...preferences,
        startingLocation: selected,
      });
      setShowSearchBox(false);
    }
  };

  const handleUseCurrentGPSLocation = async () => {
    setIsLocatingGPS(true);
    setGpsError(null);

    try {
      const loc = await detectUserLocation();
      onUpdatePreferences({
        ...preferences,
        startingLocation: {
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
        },
      });
      setShowSearchBox(false);
    } catch (err: any) {
      console.warn('Location detection failed:', err);
      setGpsError('Could not acquire location. Please search your city or choose a hub.');
    } finally {
      setIsLocatingGPS(false);
    }
  };

  const handleSearchWorldwide = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    setIsSearchingGeocode(true);
    try {
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`);
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSearchSuggestions(data.locations);
      }
    } catch (err) {
      console.warn('Geocode search failed:', err);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  const handleSelectCustomOrigin = (loc: any) => {
    onUpdatePreferences({
      ...preferences,
      startingLocation: {
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
    });
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSearchBox(false);
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    const rounded = Math.round(value * 100) / 100;
    onUpdatePreferences({
      ...preferences,
      scoringWeights: {
        ...preferences.scoringWeights,
        [key]: rounded,
      },
    });
  };

  const resetWeightsToDefault = () => {
    onUpdatePreferences({
      ...preferences,
      scoringWeights: {
        preferenceMatch: 0.35,
        budgetSuitability: 0.25,
        travelTimeSuitability: 0.20,
        weatherSuitability: 0.20,
      },
    });
  };

  const currentWeightSum = Math.round(
    (preferences.scoringWeights.preferenceMatch +
      preferences.scoringWeights.budgetSuitability +
      preferences.scoringWeights.travelTimeSuitability +
      preferences.scoringWeights.weatherSuitability) *
      100
  ) / 100;

  return (
    <div className="bg-white rounded-3xl border border-[#E8EAF2] overflow-hidden shadow-[0_10px_35px_-10px_rgba(16,24,40,0.06)]">
      <div className="bg-hero-midnight text-white p-5 sm:p-6 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] block mb-0.5">
            AI Recommendation Engine
          </span>
          <h2 className="font-display text-base sm:text-lg font-black text-white tracking-tight">
            Travel Preferences &amp; Scoring
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Configure your interests, budget, and duration for transparent AI ranking
          </p>
        </div>
        <button
          onClick={() => setShowWeightSettings(!showWeightSettings)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border cursor-pointer shrink-0 ${
            showWeightSettings
              ? 'bg-brand-gradient text-white border-transparent shadow-sm'
              : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
          }`}
          title="Customize transparent scoring formula weights (SRS FR-14)"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Weights</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {/* 1. Worldwide Starting Origin with Current Location Option */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Starting Origin & Departure Location</span>
            </label>
            <div className="flex items-center gap-1.5">
              {/* Option to give current location to start the journey */}
              <button
                type="button"
                onClick={handleUseCurrentGPSLocation}
                disabled={isLocatingGPS}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1 shadow-xs"
                title="Use device GPS to set your exact current location as starting origin"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                <span>{isLocatingGPS ? 'Detecting GPS...' : 'Use Current Location'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSearchBox(!showSearchBox)}
                className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Search className="w-3 h-3 text-slate-500" />
                <span>Search World</span>
              </button>
            </div>
          </div>

          {/* Current Active Location Display */}
          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {preferences.startingLocation.name}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Coordinates: {preferences.startingLocation.latitude.toFixed(4)}°, {preferences.startingLocation.longitude.toFixed(4)}°
              </div>
            </div>
            <span className="shrink-0 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium px-2 py-0.5 rounded-full">
              Active Origin
            </span>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              {gpsError}
            </p>
          )}

          {/* Worldwide Search Input when toggled */}
          {showSearchBox && (
            <div className="pt-1 space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchWorldwide(e.target.value)}
                  placeholder="Type any city, airport, landmark, or address worldwide..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isSearchingGeocode && (
                <div className="text-[11px] text-slate-400 pl-1">
                  Searching global destinations...
                </div>
              )}

              {searchSuggestions.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                  {searchSuggestions.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCustomOrigin(loc)}
                      className="w-full text-left p-1.5 rounded hover:bg-indigo-50 text-xs transition-colors block"
                    >
                      <div className="font-semibold text-slate-900">{loc.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{loc.fullName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Preset Selector for Global Hubs */}
          <div>
            <span className="text-[10px] text-slate-500 font-medium block mb-1">
              Or pick from Popular Worldwide Hubs:
            </span>
            <div className="relative">
              <select
                value={WORLDWIDE_PRESET_ORIGINS.findIndex((p) => p.name === preferences.startingLocation.name)}
                onChange={(e) => handleOriginChange(parseInt(e.target.value, 10))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={-1} disabled>
                  -- Select a Global City or India Destination --
                </option>
                {WORLDWIDE_PRESET_ORIGINS.map((origin, idx) => (
                  <option key={idx} value={idx}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Interests Multi-select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Travel Interests & Themes
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {preferences.interests.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_INTERESTS.map((item) => {
              const isSelected = preferences.interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleInterest(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Budget, Days Planner & Departure — separated into stacked cards */}
        <div className="space-y-3">
          {/* A. User Choice Budget Field */}
          <div className="space-y-2.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trip Budget Target</span>
              </label>
              <span className="text-[10px] text-indigo-700 font-bold uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {preferences.budget}
              </span>
            </div>

            {/* User Choice input field for custom budget */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={preferences.customBudgetAmount ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                  onUpdatePreferences({ ...preferences, customBudgetAmount: val });
                }}
                placeholder="Type your budget (e.g. 5000)"
                className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[2000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onUpdatePreferences({ ...preferences, customBudgetAmount: amt })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    preferences.customBudgetAmount === amt
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {currencySymbol}{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>

            {/* Tier selector with full labels */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-lg">
              {(['budget', 'moderate', 'luxury'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onUpdatePreferences({ ...preferences, budget: b })}
                  className={`py-1 text-[11px] font-semibold capitalize rounded-md transition-all cursor-pointer ${
                    preferences.budget === b
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* B. Days Planner (Type trip duration in days) */}
          <div className="space-y-2.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Days Planner</span>
              </label>
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {preferences.tripDurationDays} {preferences.tripDurationDays === 1 ? 'Day' : 'Days'}
              </span>
            </div>

            {/* Number input with steppers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, tripDurationDays: Math.max(1, preferences.tripDurationDays - 1) })}
                className="w-9 h-9 shrink-0 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Decrease days"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                min="1"
                max="30"
                value={preferences.tripDurationDays}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                  onUpdatePreferences({ ...preferences, tripDurationDays: val });
                }}
                className="flex-1 min-w-0 h-9 text-center text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono focus:outline-none"
                placeholder="Days"
              />

              <button
                type="button"
                onClick={() => onUpdatePreferences({ ...preferences, tripDurationDays: Math.min(30, preferences.tripDurationDays + 1) })}
                className="w-9 h-9 shrink-0 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Increase days"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick days chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onUpdatePreferences({ ...preferences, tripDurationDays: d })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    preferences.tripDurationDays === d
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* C. Departure Time */}
          <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Start Departure</span>
            </label>
            <input
              type="time"
              value={preferences.departureTime}
              onChange={(e) => onUpdatePreferences({ ...preferences, departureTime: e.target.value })}
              className="w-full h-9 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Used for rush-hour traffic predictions & heat-optimized stop sequencing.
            </p>
          </div>
        </div>

        {/* 4. Transparent Scoring Weights Panel (SRS FR-14) */}
        {showWeightSettings && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  SRS Transparent Formula Configuration
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    Math.abs(currentWeightSum - 1.0) < 0.05
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Sum: {currentWeightSum} (Target: 1.0)
                </span>
              </div>
              <button
                onClick={resetWeightsToDefault}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>Preference Match Weight</span>
                  <span className="font-mono font-semibold">{preferences.scoringWeights.preferenceMatch}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  value={preferences.scoringWeights.preferenceMatch}
                  onChange={(e) => handleWeightChange('preferenceMatch', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>Budget Suitability Weight</span>
                  <span className="font-mono font-semibold">{preferences.scoringWeights.budgetSuitability}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={preferences.scoringWeights.budgetSuitability}
                  onChange={(e) => handleWeightChange('budgetSuitability', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>Travel-Time Proximity Weight</span>
                  <span className="font-mono font-semibold">{preferences.scoringWeights.travelTimeSuitability}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.05"
                  value={preferences.scoringWeights.travelTimeSuitability}
                  onChange={(e) => handleWeightChange('travelTimeSuitability', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span>Weather Suitability Weight</span>
                  <span className="font-mono font-semibold">{preferences.scoringWeights.weatherSuitability}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.05"
                  value={preferences.scoringWeights.weatherSuitability}
                  onChange={(e) => handleWeightChange('weatherSuitability', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Formula: Recommendation Score = (w1 × Preference) + (w2 × Budget) + (w3 × TravelTime) + (w4 × Weather). All variables normalized to 0–100 scale.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-brand-gradient disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#5145E5]/25 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Computing Recommendations &amp; Routes...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                Calculate Personalized Recommendations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
