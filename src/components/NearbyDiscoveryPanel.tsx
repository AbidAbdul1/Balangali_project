import React, { useState, useEffect } from 'react';
import { Destination } from '../types/travel';
import {
  Compass,
  Utensils,
  BedDouble,
  Hospital,
  Pill,
  Landmark,
  ShoppingBag,
  Train,
  Star,
  MapPin,
  Plus,
  Check,
  ExternalLink,
  RefreshCw,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export interface NearbyDiscoveryPanelProps {
  centerLocation: { name: string; latitude: number; longitude: number };
  itineraryDestinationIds: string[];
  onAddToItinerary: (dest: Destination) => void;
  onFocusOnMap: (dest: Destination) => void;
}

const NEARBY_PRESETS = [
  { id: 'tourist_attraction', label: 'Attractions', icon: Landmark },
  { id: 'restaurant', label: 'Restaurants', icon: Utensils },
  { id: 'cafe', label: 'Cafes', icon: Utensils },
  { id: 'lodging', label: 'Hotels & Stays', icon: BedDouble },
  { id: 'hospital', label: 'Hospitals', icon: Hospital },
  { id: 'pharmacy', label: 'Pharmacies', icon: Pill },
  { id: 'atm', label: 'ATMs', icon: Landmark },
  { id: 'shopping_mall', label: 'Shopping', icon: ShoppingBag },
  { id: 'transit_station', label: 'Transit Stations', icon: Train },
];

export const NearbyDiscoveryPanel: React.FC<NearbyDiscoveryPanelProps> = ({
  centerLocation,
  itineraryDestinationIds,
  onAddToItinerary,
  onFocusOnMap,
}) => {
  const [selectedType, setSelectedType] = useState<string>('tourist_attraction');
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [openNowOnly, setOpenNowOnly] = useState<boolean>(false);
  const [places, setPlaces] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchNearby = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        lat: String(centerLocation.latitude),
        lng: String(centerLocation.longitude),
        types: selectedType,
        radius: String(radiusMeters),
        minRating: String(minRating),
        openNow: String(openNowOnly),
      });
      const res = await fetch(`/api/places/nearby?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPlaces(data.places || []);
      } else {
        setErrorMsg(data.errorMessage || data.error || 'Could not load nearby places.');
        setPlaces([]);
      }
    } catch {
      setErrorMsg('Network error loading nearby places. Check your internet connection.');
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [centerLocation.latitude, centerLocation.longitude, selectedType, radiusMeters, minRating, openNowOnly]);

  const isHotelMode = selectedType === 'lodging';
  const isFoodMode = selectedType === 'restaurant' || selectedType === 'cafe';

  return (
    <div className="space-y-8 py-2">
      {/* Editorial Header */}
      <div className="pb-6 border-b border-[#E6E2D8] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91A995]">
            Area Intelligence &amp; Live Places
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#343A36] mt-1">
            Around {centerLocation.name.split(',')[0]}
          </h2>
          <p className="text-sm text-[#858B84] mt-1 max-w-2xl">
            Live places via Google Places around coordinates ({centerLocation.latitude.toFixed(4)}, {centerLocation.longitude.toFixed(4)}).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchNearby}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-xs font-medium transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Nearby</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-[#E6E2D8] flex items-center gap-6 overflow-x-auto no-scrollbar">
        {NEARBY_PRESETS.map((preset) => {
          const active = selectedType === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedType(preset.id)}
              className={`relative pb-3 text-sm whitespace-nowrap transition-colors ${
                active
                  ? 'text-[#243C32] font-semibold'
                  : 'text-[#858B84] hover:text-[#343A36]'
              }`}
            >
              {preset.label}
              {active && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#858B84]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#343A36] font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#91A995]" />
            <span>Filters:</span>
          </div>

          <label className="flex items-center gap-1.5">
            <span>Radius:</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-lg px-2 py-1 text-xs text-[#343A36]"
            >
              <option value={1500}>1.5 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span>Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-lg px-2 py-1 text-xs text-[#343A36]"
            >
              <option value={0}>Any</option>
              <option value={3.5}>3.5★+</option>
              <option value={4.0}>4.0★+</option>
              <option value={4.5}>4.5★+</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#343A36]">
            <input
              type="checkbox"
              checked={openNowOnly}
              onChange={(e) => setOpenNowOnly(e.target.checked)}
              className="rounded accent-[#243C32]"
            />
            <span>Open Now</span>
          </label>
        </div>

        <span className="text-xs text-[#858B84]">
          {places.length} {places.length === 1 ? 'place' : 'places'} found
        </span>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-[#243C32] animate-spin mx-auto" />
          <p className="text-sm text-[#858B84]">Searching nearby places...</p>
        </div>
      ) : errorMsg ? (
        <p className="py-8 text-sm text-[#D68B65]">{errorMsg}</p>
      ) : places.length === 0 ? (
        <p className="py-8 text-sm text-[#858B84]">
          No places matched these filters. Try increasing the radius or lowering the minimum rating.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {places.map((place) => {
            const inPlan = itineraryDestinationIds.includes(place.id);
            return (
              <article key={place.id} className="group space-y-3">
                <div className="relative overflow-hidden rounded-2xl aspect-[16/10] bg-[#EFECE4]">
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#858B84] text-xs">
                      No photo available
                    </div>
                  )}

                  {place.rating > 0 && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 text-xs font-semibold text-[#343A36]">
                      <Star className="w-3 h-3 text-[#D68B65] fill-[#D68B65]" />
                      {place.rating.toFixed(1)}
                      {place.reviewsCount > 0 && (
                        <span className="text-[#858B84] font-normal">({place.reviewsCount.toLocaleString()})</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-display font-semibold text-[#343A36] text-base group-hover:text-[#243C32] transition-colors line-clamp-1">
                    {place.name}
                  </h3>

                  <p className="text-xs text-[#858B84] line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#91A995] shrink-0" />
                    <span>{place.address}</span>
                  </p>

                  {place.openingHours && (
                    <p className="text-[11px] text-[#858B84] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#858B84]" />
                      <span>{place.openingHours}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onAddToItinerary(place)}
                      disabled={inPlan}
                      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        inPlan
                          ? 'bg-[#91A995]/20 text-[#243C32]'
                          : 'bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF]'
                      }`}
                    >
                      {inPlan ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{inPlan ? 'In plan' : 'Add to plan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onFocusOnMap(place)}
                      className="text-xs font-medium text-[#343A36] hover:text-[#243C32]"
                    >
                      Focus map
                    </button>

                    {place.googleMapsUri && (
                      <a
                        href={place.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-[#858B84] hover:text-[#343A36]"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {isHotelMode && (
                      <a
                        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-[#243C32] font-medium hover:underline"
                      >
                        <span>Check rates</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {isFoodMode && (
                      <a
                        href={`https://www.zomato.com/search?q=${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-[#D68B65] font-medium hover:underline"
                      >
                        <span>Menu</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NearbyDiscoveryPanel;
