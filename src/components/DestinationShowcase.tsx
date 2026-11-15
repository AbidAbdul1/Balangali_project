import React, { useState, useRef } from 'react';
import { WorldRegion, ALL_REGIONS } from '../data/destinations';
import { Heart, Search, ArrowRight, Loader2 } from 'lucide-react';

export interface DestinationShowcaseProps {
  onSelectRegion: (region: WorldRegion) => void;
  onSearchCustomCity: (query: string) => void;
  isSearching: boolean;
}

export const REGION_COVER_IMAGES: Record<string, string> = {
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
  hyderabad: 'https://images.unsplash.com/photo-1609137144822-0d33e536136e?auto=format&fit=crop&w=1000&q=80',
  mumbai: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1000&q=80',
  jaipur: 'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?auto=format&fit=crop&w=1000&q=80',
  delhi: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1000&q=80',
  agra: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1000&q=80',
  varanasi: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
  visakhapatnam: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
  bengaluru: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1000&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=80',
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1000&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=80',
  'new-york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1000&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=80',
  sydney: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1000&q=80',
  vijayawada: '/images/travelmate_kanakadurga_temple_1793036233893.jpg',
};

type ShowcaseFilterType =
  | 'all'
  | 'india'
  | 'international'
  | 'beach'
  | 'mountains'
  | 'culture'
  | 'city'
  | 'food'
  | 'favorites';

const CATEGORY_TABS: Array<{ id: ShowcaseFilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'india', label: 'India' },
  { id: 'international', label: 'International' },
  { id: 'beach', label: 'Coast & Beaches' },
  { id: 'mountains', label: 'Mountains & Hills' },
  { id: 'culture', label: 'Heritage & Culture' },
  { id: 'city', label: 'Cities' },
  { id: 'food', label: 'Culinary' },
  { id: 'favorites', label: 'Saved' },
];

function getRegionCategories(region: WorldRegion): ShowcaseFilterType[] {
  const cats: ShowcaseFilterType[] = ['all'];
  if (region.isInternational) cats.push('international');
  else cats.push('india');

  const text = `${region.id} ${region.name} ${region.tagline}`.toLowerCase();
  if (text.includes('beach') || text.includes('coast') || text.includes('island') || region.id === 'goa' || region.id === 'visakhapatnam' || region.id === 'sydney') {
    cats.push('beach');
  }
  if (text.includes('hill') || text.includes('valley') || text.includes('araku') || text.includes('park')) {
    cats.push('mountains');
  }
  if (text.includes('temple') || text.includes('heritage') || text.includes('royal') || text.includes('history') || text.includes('culture') || ['jaipur', 'agra', 'varanasi', 'rome', 'paris', 'vijayawada'].includes(region.id)) {
    cats.push('culture');
  }
  if (text.includes('food') || text.includes('cuisine') || text.includes('culinary') || ['hyderabad', 'tokyo', 'paris', 'delhi', 'mumbai'].includes(region.id)) {
    cats.push('food');
  }
  if (region.isInternational || ['mumbai', 'delhi', 'bengaluru', 'hyderabad', 'dubai', 'singapore', 'new-york', 'london', 'tokyo'].includes(region.id)) {
    cats.push('city');
  }
  return cats;
}

export const DestinationShowcase: React.FC<DestinationShowcaseProps> = ({
  onSelectRegion,
  onSearchCustomCity,
  isSearching,
}) => {
  const [filterType, setFilterType] = useState<ShowcaseFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('travelmate_favorite_regions');
      return saved ? JSON.parse(saved) : ['goa', 'paris', 'jaipur'];
    } catch {
      return ['goa', 'paris', 'jaipur'];
    }
  });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('travelmate_favorite_regions', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredRegions = ALL_REGIONS.filter((region) => {
    if (filterType === 'favorites') return favorites.includes(region.id);
    if (filterType === 'all') return true;
    return getRegionCategories(region).includes(filterType);
  }).filter((region) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      region.name.toLowerCase().includes(q) ||
      (region.country || '').toLowerCase().includes(q) ||
      region.state.toLowerCase().includes(q) ||
      region.tagline.toLowerCase().includes(q)
    );
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const exactMatch = ALL_REGIONS.find((r) => r.name.toLowerCase() === q.toLowerCase());
    if (exactMatch) {
      onSelectRegion(exactMatch);
    } else {
      onSearchCustomCity(q);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Editorial Photographic Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-4">
        <div className="lg:col-span-6 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91A995]">
            Thoughtful Travel Planning
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-semibold leading-[1.06] text-[#343A36]">
            Discover somewhere wonderful.
          </h1>
          <p className="text-base sm:text-lg text-[#858B84] leading-relaxed max-w-xl">
            Curated places, calm day-by-day itineraries, real weather and traffic context, and effortless shared trip rooms — all in one quiet space.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium transition-colors"
            >
              <span>Explore destinations</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 border-b border-[#D8D2C5] focus-within:border-[#243C32] py-1.5 min-w-[240px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-[#858B84] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any city worldwide..."
                className="w-full bg-transparent text-sm text-[#343A36] placeholder-[#858B84] focus:outline-none"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  disabled={isSearching}
                  className="text-xs font-medium text-[#243C32] hover:underline shrink-0"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Hero Feature Photography */}
        <div className="lg:col-span-6">
          <div className="relative overflow-hidden rounded-3xl aspect-[16/10] bg-[#EFECE4]">
            <img
              src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80"
              alt="Scenic European morning skyline"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Underlined Editorial Category Filter Tabs */}
      <section ref={gridRef} className="space-y-8">
        <div className="border-b border-[#E6E2D8] flex items-center gap-6 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`relative pb-3 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[#243C32] font-semibold'
                    : 'text-[#858B84] hover:text-[#343A36] font-normal'
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Open 3-Column Photographic Destination Grid */}
        {filteredRegions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-[#858B84]">
              No curated destinations matched &ldquo;{searchQuery || filterType}&rdquo;.
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => onSearchCustomCity(searchQuery.trim())}
                disabled={isSearching}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#243C32] text-[#FFFFFF] text-sm font-medium"
              >
                {isSearching ? 'Searching...' : `Explore "${searchQuery.trim()}" with AI`}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {filteredRegions.map((region) => {
              const cover =
                !failedImages[region.id] && REGION_COVER_IMAGES[region.id]
                  ? REGION_COVER_IMAGES[region.id]
                  : 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80';
              const isFav = favorites.includes(region.id);

              return (
                <article
                  key={region.id}
                  onClick={() => onSelectRegion(region)}
                  className="group cursor-pointer space-y-3"
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[16/10] bg-[#EFECE4]">
                    <img
                      src={cover}
                      alt={region.name}
                      loading="lazy"
                      onError={() => setFailedImages((prev) => ({ ...prev, [region.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, region.id)}
                      aria-label={isFav ? `Remove ${region.name} from favorites` : `Save ${region.name}`}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs flex items-center justify-center text-[#343A36] hover:scale-105 transition-transform"
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-[#D68B65] text-[#D68B65]' : 'text-[#343A36]'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 pt-0.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display text-lg font-semibold text-[#343A36] group-hover:text-[#243C32] transition-colors truncate">
                          {region.name}
                        </h3>
                        <span className="text-xs text-[#858B84] shrink-0">
                          {region.country || region.state}
                        </span>
                      </div>
                      <p className="text-sm text-[#858B84] line-clamp-1">
                        {region.tagline}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#243C32] shrink-0 pt-1 group-hover:translate-x-0.5 transition-transform">
                      Explore <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default DestinationShowcase;
