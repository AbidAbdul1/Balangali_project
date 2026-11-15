import React, { useState, useEffect } from 'react';
import { Destination } from '../types/travel';
import { CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import { MapPin, Star, Plus, Check, Search, Loader2, ExternalLink } from 'lucide-react';

interface PopularPlacesProps {
  destinationCity: string;
  destinationCoords?: { latitude: number; longitude: number };
  itineraryDestinations: Destination[];
  onAddToItinerary: (place: Destination) => void;
  onRemoveFromItinerary: (placeId: string) => void;
  onSelectPlaceForMap?: (place: Destination) => void;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'All', label: 'All sights' },
  { id: 'tourist attractions and sights', label: 'Highlights' },
  { id: 'temples and historical landmarks', label: 'Heritage' },
  { id: 'parks, nature and beaches', label: 'Nature' },
  { id: 'museums and cultural monuments', label: 'Museums & Art' },
  { id: 'popular food destinations and restaurants', label: 'Local Food' },
];

export const PopularPlaces: React.FC<PopularPlacesProps> = ({
  destinationCity,
  destinationCoords,
  itineraryDestinations,
  onAddToItinerary,
  onRemoveFromItinerary,
  onSelectPlaceForMap,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cityInput, setCityInput] = useState(destinationCity);
  const [places, setPlaces] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setCityInput(destinationCity);
    fetchPlaces(destinationCity, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCity]);

  const fetchPlaces = async (city: string, category: string) => {
    if (!city.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const catParam = category !== 'All' ? `&category=${encodeURIComponent(category)}` : '';
      const coordParam =
        destinationCoords && city.toLowerCase() === destinationCity.toLowerCase()
          ? `&lat=${destinationCoords.latitude}&lon=${destinationCoords.longitude}`
          : '';
      const resp = await fetch(
        `/api/places/search?destination=${encodeURIComponent(city.trim())}${catParam}${coordParam}`
      );
      const data = await resp.json();
      if (resp.ok && data.success && Array.isArray(data.places)) {
        setPlaces(data.places);
      } else {
        setPlaces([]);
        setErrorMsg(data.error || 'Could not load nearby highlights right now.');
      }
    } catch {
      setPlaces([]);
      setErrorMsg('Unable to reach live places discovery.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    fetchPlaces(cityInput || destinationCity, catId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces(cityInput, selectedCategory);
  };

  return (
    <section className="pt-10 border-t border-[#E6E2D8] space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            Live Places Discovery
          </p>
          <h2 className="font-display text-2xl font-semibold text-[#343A36] mt-1">
            Popular sights around {cityInput || destinationCity}
          </h2>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 border-b border-[#D8D2C5] focus-within:border-[#243C32] py-1.5 min-w-[240px]">
          <Search className="w-4 h-4 text-[#858B84]" />
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search city sights..."
            className="w-full bg-transparent text-sm text-[#343A36] placeholder-[#858B84] focus:outline-none"
          />
          <button type="submit" className="text-xs font-medium text-[#243C32] hover:underline shrink-0">
            Find
          </button>
        </form>
      </div>

      {/* Underlined Category Filters */}
      <div className="border-b border-[#E6E2D8] flex items-center gap-6 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`relative pb-2.5 text-sm whitespace-nowrap transition-colors ${
                active ? 'text-[#243C32] font-semibold' : 'text-[#858B84] hover:text-[#343A36]'
              }`}
            >
              {cat.label}
              {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-[#858B84]">
          <Loader2 className="w-4 h-4 animate-spin text-[#243C32]" />
          <span>Finding notable places in {cityInput}...</span>
        </div>
      ) : errorMsg ? (
        <p className="py-8 text-sm text-[#858B84]">{errorMsg}</p>
      ) : places.length === 0 ? (
        <p className="py-8 text-sm text-[#858B84]">No places found for this filter. Try All sights.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
          {places.map((place) => {
            const inPlan = itineraryDestinations.some((d) => d.id === place.id);
            const cover =
              place.imageUrl ||
              CATEGORY_FALLBACK_IMAGES[place.category] ||
              CATEGORY_FALLBACK_IMAGES['All'];

            return (
              <article key={place.id} className="group space-y-2.5">
                <div
                  onClick={() => onSelectPlaceForMap?.(place)}
                  className="relative overflow-hidden rounded-2xl aspect-[16/10] bg-[#EFECE4] cursor-pointer"
                >
                  <img
                    src={cover}
                    alt={place.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onSelectPlaceForMap?.(place)}
                      className="font-display text-base font-semibold text-[#343A36] hover:text-[#243C32] cursor-pointer line-clamp-1"
                    >
                      {place.name}
                    </h3>
                    {place.rating > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#343A36] shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#D68B65] text-[#D68B65]" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#858B84] line-clamp-2">
                    {place.shortDescription || place.address}
                  </p>

                  <div className="flex items-center justify-between pt-1.5">
                    <button
                      type="button"
                      onClick={() => (inPlan ? onRemoveFromItinerary(place.id) : onAddToItinerary(place))}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        inPlan
                          ? 'bg-[#91A995]/20 text-[#243C32]'
                          : 'bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF]'
                      }`}
                    >
                      {inPlan ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{inPlan ? 'Added' : 'Add to trip'}</span>
                    </button>

                    <div className="flex items-center gap-3 text-xs text-[#858B84]">
                      {onSelectPlaceForMap && (
                        <button
                          type="button"
                          onClick={() => onSelectPlaceForMap(place)}
                          className="inline-flex items-center gap-1 hover:text-[#343A36]"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Map</span>
                        </button>
                      )}
                      {place.googleMapsUri && (
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-[#343A36]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PopularPlaces;
