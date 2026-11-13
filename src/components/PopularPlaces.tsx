import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Destination } from '../types/travel';
import { CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import {
  MapPin,
  Star,
  Plus,
  Check,
  Compass,
  ExternalLink,
  Search,
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
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

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
    <section className="bg-white rounded-3xl border border-[#E8EAF2] p-6 shadow-[0_10px_35px_-10px_rgba(16,24,40,0.05)] mb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EAF2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5145E5]">
              Live Local Discovery
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] font-bold">
              Verified Places
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-[#101828] tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
            <span>Popular Places in</span>
            <span className="text-[#5145E5]">{destinationCity || 'Your Destination'}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {totalFound > 0 && (
            <span className="text-xs text-[#64748B] font-semibold">
              {totalFound} verified places found
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchPlaces(destinationCity, selectedCategory)}
            disabled={isLoading}
            className="p-2 text-[#64748B] hover:text-[#5145E5] rounded-xl bg-[#F7F8FC] hover:bg-slate-100 border border-[#E8EAF2] transition-colors cursor-pointer disabled:opacity-40"
            title="Refresh Places"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Pills & Filter Bar */}
      <div className="pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedCategory === cat.id
                  ? 'bg-[#101828] text-white border-[#101828] shadow-sm'
                  : 'bg-[#F7F8FC] text-[#64748B] border-[#E8EAF2] hover:bg-white hover:text-[#101828]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[230px]">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter discovered places..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8FC] border border-[#E8EAF2] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5145E5]/20 focus:border-[#5145E5] text-[#101828] transition-all placeholder:text-[#64748B]"
          />
        </div>
      </div>

      {/* Skeleton Shimmer Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-[#E8EAF2] overflow-hidden bg-white p-0"
            >
              <div className="h-44 w-full skeleton-shimmer" />
              <div className="p-4 space-y-2.5">
                <div className="h-3 w-20 rounded-full skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
                <div className="h-3 w-full rounded-lg skeleton-shimmer" />
                <div className="h-8 w-full rounded-xl skeleton-shimmer mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error / Empty State */}
      {!isLoading && errorMessage && (
        <div className="py-10 text-center text-[#64748B] bg-[#F7F8FC] rounded-2xl border border-[#E8EAF2] p-6 mt-2">
          <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-[#101828]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => fetchPlaces(destinationCity, 'All')}
            className="mt-2.5 text-xs font-bold text-[#5145E5] hover:underline cursor-pointer"
          >
            Try searching all categories
          </button>
        </div>
      )}

      {/* Discovered Places Grid */}
      {!isLoading && !errorMessage && filteredPlaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-3">
          {filteredPlaces.map((place, idx) => {
            const inPlan = planIds.has(place.id);
            const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              place.name
            )}&query_place_id=${place.id}`;
            const fallbackImg =
              CATEGORY_FALLBACK_IMAGES[place.category] || CATEGORY_FALLBACK_IMAGES['All'];
            const resolvedImg =
              !place.imageUrl || brokenImages[place.id] ? fallbackImg : place.imageUrl;

            return (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.03, 0.3),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`luxury-card group overflow-hidden flex flex-col ${
                  inPlan ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/20' : ''
                }`}
              >
                {/* Place Photo */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={resolvedImg}
                    alt={place.name}
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [place.id]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/75 via-transparent to-transparent pointer-events-none" />

                  {/* Real Rating Badge */}
                  {place.rating > 0 && (
                    <div className="absolute top-3 left-3 bg-[#101828]/75 backdrop-blur-md text-white border border-white/15 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{place.rating.toFixed(1)}</span>
                      {place.reviewsCount > 0 && (
                        <span className="text-white/70 font-normal">
                          ({place.reviewsCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}

                  {/* In Plan Badge */}
                  {inPlan && (
                    <div className="absolute top-3 right-3 bg-[#14B8A6] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3" />
                      <span>In Plan</span>
                    </div>
                  )}
                </div>

                {/* Place Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-[#5145E5] uppercase tracking-wider mb-1">
                      <span className="truncate">{place.category}</span>
                    </div>

                    <h3 className="font-display font-bold text-[#101828] text-sm line-clamp-1 group-hover:text-[#5145E5] transition-colors">
                      {place.name}
                    </h3>

                    <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-relaxed">
                      {place.description}
                    </p>

                    {place.address && (
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#64748B] truncate">
                        <MapPin className="w-3 h-3 text-[#5145E5] shrink-0" />
                        <span className="truncate">{place.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-[#E8EAF2] flex items-center justify-between gap-2">
                    <a
                      href={googleMapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#64748B] hover:text-[#5145E5] flex items-center gap-1 transition-colors"
                      title="Open on Google Maps"
                    >
                      <span>Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      {onSelectPlaceForMap && (
                        <button
                          type="button"
                          onClick={() => onSelectPlaceForMap(place)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-[#101828] hover:bg-[#F7F8FC] border border-[#E8EAF2] rounded-xl cursor-pointer transition-colors"
                          title="View on Interactive Map"
                        >
                          Map
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
                          className="flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-bold text-white bg-brand-gradient rounded-xl cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
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
    </section>
  );
};
