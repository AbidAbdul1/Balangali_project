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

interface NearbyDiscoveryPanelProps {
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
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4" />
              Nearby Discovery, Hotels & Dining
            </div>
            <h2 className="font-display text-xl font-extrabold text-slate-900">
              Around {centerLocation.name.split(',')[0]}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-world places via Google Places API (New) near ({centerLocation.latitude.toFixed(4)}, {centerLocation.longitude.toFixed(4)}). External booking/delivery links open third-party sites and do not confirm live availability.
            </p>
          </div>

          <button
            onClick={fetchNearby}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Nearby
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {NEARBY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = selectedType === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedType(preset.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Distance, Rating, Open Now Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Filters:
          </div>

          <label className="flex items-center gap-1.5 text-slate-700">
            <span>Radius:</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-medium"
            >
              <option value={1500}>1.5 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-slate-700">
            <span>Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-medium"
            >
              <option value={0}>Any</option>
              <option value={3.5}>3.5★+</option>
              <option value={4.0}>4.0★+</option>
              <option value={4.5}>4.5★+</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={openNowOnly}
              onChange={(e) => setOpenNowOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>Open Now Only</span>
          </label>

          <span className="ml-auto text-slate-500 font-medium">
            {places.length} {places.length === 1 ? 'place' : 'places'} found
          </span>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Searching nearby places via Google Places API (New)...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
          <p className="font-bold mb-1">Nearby Search Notice</p>
          <p>{errorMsg}</p>
        </div>
      ) : places.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No places matched these filters. Try increasing the radius or lowering the minimum rating.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.map((place) => {
            const inPlan = itineraryDestinationIds.includes(place.id);
            return (
              <div
                key={place.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
              >
                <div className="relative h-40 bg-slate-100">
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No photo available
                    </div>
                  )}
                  {place.rating > 0 && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/85 text-white text-xs font-bold">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {place.rating.toFixed(1)}
                      {place.reviewsCount > 0 && (
                        <span className="text-slate-300 font-normal">({place.reviewsCount.toLocaleString()})</span>
                      )}
                    </span>
                  )}
                  {place.priceLevel && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold">
                      {place.priceLevel.replace('PRICE_LEVEL_', '')}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm line-clamp-1">{place.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{place.address}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{place.openingHours}</span>
                    </p>
                    {place.photoAttribution && (
                      <p className="text-[10px] text-slate-400 mt-1">Photo: {place.photoAttribution}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onAddToItinerary(place)}
                      disabled={inPlan}
                      className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        inPlan
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {inPlan ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {inPlan ? 'In Plan' : 'Add to Plan'}
                    </button>

                    <button
                      onClick={() => onFocusOnMap(place)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Map
                    </button>

                    {place.googleMapsUri && (
                      <a
                        href={place.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Maps
                      </a>
                    )}

                    {isHotelMode && (
                      <a
                        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100"
                      >
                        Check Rates <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {isFoodMode && (
                      <a
                        href={`https://www.zomato.com/search?q=${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100"
                      >
                        Zomato / Menu <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

