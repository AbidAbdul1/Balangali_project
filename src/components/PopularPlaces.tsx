import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Destination, DestinationCategory } from '../types/travel';
import {
  MapPin,
  Star,
  Plus,
  Check,
  Compass,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface PopularPlacesProps {
  destinationCity: string;
  destinationCoords?: { latitude: number; longitude: number };
  itineraryDestinations: Destination[];
  onAddToItinerary: (place: Destination) => void;
  onRemoveFromItinerary: (placeId: string) => void;
  onSelectPlaceForMap?: (place: Destination) => void;
}

const CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
  { id: 'All', label: 'All Sights', icon: '✨' },
  { id: 'tourist attractions and sights', label: 'Top Attractions', icon: '🏛️' },
  { id: 'temples and historical landmarks', label: 'Heritage & Temples', icon: '🛕' },
  { id: 'parks, nature and beaches', label: 'Nature & Parks', icon: '🌿' },
  { id: 'museums and cultural monuments', label: 'Museums & Art', icon: '🎨' },
  { id: 'popular food destinations and restaurants', label: 'Food & Dining', icon: '🍛' },
];

export const PopularPlaces: React.FC<PopularPlacesProps> = ({
  destinationCity,
  destinationCoords,
  itineraryDestinations,
  onAddToItinerary,
  onRemoveFromItinerary,
  onSelectPlaceForMap,
}) => {
  const [places, setPlaces] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);

  // Set of IDs currently in plan
  const planIds = new Set(itineraryDestinations.map((d) => d.id));

  const fetchPlaces = async (city: string, cat: string) => {
    if (!city.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const catParam = cat !== 'All' ? `&category=${encodeURIComponent(cat)}` : '';
      const coordParam =
        destinationCoords && destinationCoords.latitude
          ? `&latitude=${destinationCoords.latitude}&longitude=${destinationCoords.longitude}`
          : '';

      const resp = await fetch(
        `/api/places/search?destination=${encodeURIComponent(city.trim())}${catParam}${coordParam}`
      );
      const data = await resp.json();

      if (resp.ok && data.success && Array.isArray(data.places)) {
        setPlaces(data.places);
        setTotalFound(data.totalFound || data.places.length);
      } else {
        setPlaces([]);
        setErrorMessage(data.errorMessage || 'No places discovered for this destination yet.');
      }
    } catch (err: any) {
      console.error('Fetch places error:', err);
      setErrorMessage('Could not connect to Places API. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (destinationCity) {
      fetchPlaces(destinationCity, selectedCategory);
    }
  }, [destinationCity, selectedCategory]);

  const filteredPlaces = places.filter((p) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.address.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <span>Google Places API (New)</span>
            </span>
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
              Verified Real Data
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>Discover Popular Places in</span>
            <span className="text-indigo-600 underline decoration-indigo-300 decoration-2">
              {destinationCity || 'Your Destination'}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            {totalFound > 0 && `${totalFound} verified places found`}
          </span>
          <button
            type="button"
            onClick={() => fetchPlaces(destinationCity, selectedCategory)}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            title="Refresh Places from Google"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Pills & Filter Bar */}
      <div className="pt-3 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedCategory === cat.id
                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                  : 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter discovered places..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/90 border border-slate-200/90 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-14 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2.5" />
          <p className="text-xs font-bold text-slate-700">
            Querying Google Places API (New) for {destinationCity}...
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fetching verified photos, ratings, and coordinates</p>
        </div>
      )}

      {/* Error / Empty State */}
      {!isLoading && errorMessage && (
        <div className="py-10 text-center text-slate-500 bg-white/60 rounded-2xl border border-slate-200/80 p-6">
          <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">{errorMessage}</p>
          <button
            onClick={() => fetchPlaces(destinationCity, 'All')}
            className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            Try searching all categories
          </button>
        </div>
      )}

      {/* Discovered Places Grid */}
      {!isLoading && !errorMessage && filteredPlaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-3">
          {filteredPlaces.map((place, idx) => {
            const inPlan = planIds.has(place.id);
            const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              place.name
            )}&query_place_id=${place.id}`;

            return (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
                className={`group rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col bg-white hover:-translate-y-1 ${
                  inPlan
                    ? 'border-indigo-600 ring-2 ring-indigo-600/15 shadow-md'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-[0_16px_36px_-6px_rgba(15,23,42,0.08)]'
                }`}
              >
                {/* Place Photo */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50/50 text-slate-400">
                      <Compass className="w-8 h-8 text-indigo-300 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-500">{place.category}</span>
                    </div>
                  )}

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Rating Badge */}
                  {place.rating > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-slate-950/70 backdrop-blur-md text-white border border-white/10 text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{place.rating.toFixed(1)}</span>
                      {place.reviewsCount > 0 && (
                        <span className="text-white/60 font-normal">({place.reviewsCount.toLocaleString()})</span>
                      )}
                    </div>
                  )}

                  {/* In Plan Badge */}
                  {inPlan && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3" />
                      <span>In Plan</span>
                    </div>
                  )}
                </div>

                {/* Place Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                      <span className="truncate">{place.category}</span>
                    </div>

                    <h3 className="font-display font-bold text-slate-950 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {place.name}
                    </h3>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {place.description}
                    </p>

                    <div className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-400 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={googleMapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                      title="Open on Google Maps"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      {onSelectPlaceForMap && (
                        <button
                          type="button"
                          onClick={() => onSelectPlaceForMap(place)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                          title="View on Interactive Map"
                        >
                          View Map
                        </button>
                      )}

                      {inPlan ? (
                        <button
                          type="button"
                          onClick={() => onRemoveFromItinerary(place.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200/80 rounded-xl cursor-pointer transition-colors"
                        >
                          <span>Remove</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToItinerary(place)}
                          className="flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-semibold text-white bg-slate-950 hover:bg-slate-900 rounded-xl cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add to Plan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

