import React, { useState } from 'react';
import { UserPreference, ScoringWeights } from '../types/travel';
import { VIJAYAWADA_ORIGIN } from '../data/destinations';
import { Search, SlidersHorizontal, Navigation, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PreferenceFormProps {
  preferences: UserPreference;
  onUpdatePreferences: (prefs: UserPreference) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const WORLDWIDE_PRESET_ORIGINS = [
  { name: 'Vijayawada Central Junction (Besant Rd / Station), India', latitude: 16.5161, longitude: 80.6200 },
  { name: 'Paris Central / Châtelet, France', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Tokyo Station / Marunouchi, Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'London Trafalgar Square / West End, UK', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Hyderabad Secunderabad Junction, India', latitude: 17.4339, longitude: 78.5042 },
  { name: 'Bengaluru Majestic Hub, India', latitude: 12.9778, longitude: 77.5714 },
  { name: 'New York Times Square / Midtown, USA', latitude: 40.758, longitude: -73.9855 },
  { name: 'Dubai Downtown / Burj Khalifa, UAE', latitude: 25.1972, longitude: 55.2744 },
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
  const { currencySymbol } = useLanguage();
  const [citySearch, setCitySearch] = useState('');
  const [geocodedResults, setGeocodedResults] = useState<any[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showAdvancedWeights, setShowAdvancedWeights] = useState(false);

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
        startingLocation: {
          name: selected.name,
          latitude: selected.latitude,
          longitude: selected.longitude,
        },
      });
    }
  };

  const handleSearchWorldwide = async (text: string) => {
    setCitySearch(text);
    if (text.trim().length < 2) {
      setGeocodedResults([]);
      return;
    }
    setIsGeocoding(true);
    try {
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`);
      const data = await resp.json();
      if (data.success && Array.isArray(data.locations)) {
        setGeocodedResults(data.locations.slice(0, 5));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSelectCustomOrigin = (loc: any) => {
    onUpdatePreferences({
      ...preferences,
      startingLocation: {
        name: loc.name,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
      },
    });
    setCitySearch('');
    setGeocodedResults([]);
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

  const handleResetWeights = () => {
    onUpdatePreferences({
      ...preferences,
      scoringWeights: {
        preferenceMatch: 0.35,
        budgetSuitability: 0.25,
        travelTimeSuitability: 0.20,
        weatherSuitability: 0.20,
      },
      startingLocation: VIJAYAWADA_ORIGIN,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6 pb-8 border-b border-[#E6E2D8]"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
          Tailored Discovery
        </p>
        <h2 className="font-display text-2xl font-semibold text-[#343A36] mt-0.5">
          How would you like to travel?
        </h2>
      </div>

      {/* Starting Location */}
      <div className="space-y-2.5 pt-2 border-t border-[#E6E2D8]">
        <label className="block text-xs font-medium text-[#858B84]">Starting Hub</label>
        <div className="flex items-center gap-2 text-sm text-[#343A36]">
          <Navigation className="w-4 h-4 text-[#243C32] shrink-0" />
          <select
            value={WORLDWIDE_PRESET_ORIGINS.findIndex((p) => p.name === preferences.startingLocation.name)}
            onChange={(e) => handleOriginChange(Number(e.target.value))}
            className="w-full py-2 px-3 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] focus:outline-none focus:border-[#243C32]"
          >
            <option value={-1}>{preferences.startingLocation.name}</option>
            {WORLDWIDE_PRESET_ORIGINS.map((origin, idx) => (
              <option key={origin.name} value={idx}>
                {origin.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#858B84] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={citySearch}
            onChange={(e) => handleSearchWorldwide(e.target.value)}
            placeholder="Or type any starting city..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
          />
          {isGeocoding && (
            <span className="text-[11px] text-[#858B84] block mt-1">Searching locations...</span>
          )}
          {geocodedResults.length > 0 && (
            <div className="mt-1 bg-[#FFFFFF] border border-[#E6E2D8] rounded-xl divide-y divide-[#F1EDE4]">
              {geocodedResults.map((loc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCustomOrigin(loc)}
                  className="w-full text-left px-3 py-2 text-xs text-[#343A36] hover:bg-[#F7F5EF]"
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2.5 pt-2 border-t border-[#E6E2D8]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#858B84]">Interests &amp; Themes</span>
          <span className="text-[#91A995]">{preferences.interests.length} selected</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_INTERESTS.map((item) => {
            const active = preferences.interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#243C32] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border border-[#E6E2D8] text-[#343A36] hover:border-[#243C32]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget & Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6E2D8]">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#858B84]">Budget comfort</label>
          <select
            value={preferences.budget}
            onChange={(e) =>
              onUpdatePreferences({
                ...preferences,
                budget: e.target.value as 'budget' | 'moderate' | 'luxury',
              })
            }
            className="w-full py-2 px-3 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] focus:outline-none focus:border-[#243C32]"
          >
            <option value="budget">Budget friendly</option>
            <option value="moderate">Moderate comfort</option>
            <option value="luxury">Elevated &amp; luxury</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#858B84]">
            Custom cap ({currencySymbol})
          </label>
          <input
            type="number"
            min={0}
            step={500}
            placeholder="Optional limit"
            value={preferences.customBudgetAmount ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onUpdatePreferences({
                ...preferences,
                customBudgetAmount: raw ? Number(raw) : undefined,
              });
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#858B84]">Preferred transit</label>
          <select
            value={preferences.travelMode}
            onChange={(e) =>
              onUpdatePreferences({
                ...preferences,
                travelMode: e.target.value as 'driving' | 'transit' | 'walking' | 'flight',
              })
            }
            className="w-full py-2 px-3 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] focus:outline-none focus:border-[#243C32]"
          >
            <option value="driving">Cab / Car</option>
            <option value="transit">Public Transit</option>
            <option value="walking">Scenic Walking</option>
            <option value="flight">Air / Intercity</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#858B84]">Departure time</label>
          <input
            type="time"
            value={preferences.departureTime}
            onChange={(e) => onUpdatePreferences({ ...preferences, departureTime: e.target.value })}
            className="w-full py-2 px-3 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] focus:outline-none focus:border-[#243C32]"
          />
        </div>
      </div>

      {/* Expandable Transparent Scoring Weights */}
      <div className="pt-2 border-t border-[#E6E2D8] space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvancedWeights((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#858B84] hover:text-[#343A36]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Fine-tune recommendation priorities</span>
          {showAdvancedWeights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedWeights && (
          <div className="space-y-3 pt-1">
            {[
              { key: 'preferenceMatch' as const, label: 'Interests match' },
              { key: 'budgetSuitability' as const, label: 'Budget suitability' },
              { key: 'travelTimeSuitability' as const, label: 'Travel time convenience' },
              { key: 'weatherSuitability' as const, label: 'Weather comfort' },
            ].map((w) => (
              <div key={w.key} className="space-y-1">
                <div className="flex justify-between text-xs text-[#858B84]">
                  <span>{w.label}</span>
                  <span className="font-mono text-[#343A36]">{preferences.scoringWeights[w.key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={preferences.scoringWeights[w.key]}
                  onChange={(e) => handleWeightChange(w.key, parseFloat(e.target.value))}
                  className="w-full accent-[#243C32]"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={handleResetWeights}
              className="text-xs text-[#243C32] hover:underline"
            >
              Reset default balance
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isLoading ? 'Scoring matches...' : 'Rank destinations for me'}</span>
      </button>
    </form>
  );
};

export default PreferenceForm;
