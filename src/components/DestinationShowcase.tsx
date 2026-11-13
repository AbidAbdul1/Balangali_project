import React, { useState, useEffect } from 'react';
import { WorldRegion, ALL_REGIONS } from '../data/destinations';
import {
  Search,
  Sparkles,
  MapPin,
  ArrowUpRight,
  Compass,
  Heart,
  Globe2,
  Sun,
  Palmtree,
  Mountain,
  Landmark,
  Flame,
  Trees,
  Building2,
} from 'lucide-react';

interface DestinationShowcaseProps {
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

const FALLBACK_DESTINATION_COVER =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80';

export type ShowcaseFilterType =
  | 'all'
  | 'india'
  | 'international'
  | 'beaches'
  | 'mountains'
  | 'historical'
  | 'adventure'
  | 'nature'
  | 'cities';

const REGION_CATEGORY_TAGS: Record<string, ShowcaseFilterType[]> = {
  vijayawada: ['india', 'historical', 'nature', 'cities'],
  hyderabad: ['india', 'historical', 'cities'],
  visakhapatnam: ['india', 'beaches', 'mountains', 'nature', 'adventure'],
  jaipur: ['india', 'historical', 'cities', 'adventure'],
  bengaluru: ['india', 'nature', 'cities', 'mountains'],
  delhi: ['india', 'historical', 'cities'],
  mumbai: ['india', 'beaches', 'cities', 'historical'],
  goa: ['india', 'beaches', 'nature', 'adventure'],
  agra: ['india', 'historical', 'cities'],
  varanasi: ['india', 'historical', 'cities'],
  paris: ['international', 'historical', 'cities'],
  tokyo: ['international', 'cities', 'nature', 'mountains'],
  london: ['international', 'historical', 'cities'],
  'new-york': ['international', 'cities', 'nature'],
  dubai: ['international', 'beaches', 'adventure', 'cities'],
  rome: ['international', 'historical', 'cities'],
  singapore: ['international', 'nature', 'cities', 'beaches'],
  sydney: ['international', 'beaches', 'nature', 'adventure', 'cities'],
};

function matchesRegionFilter(region: WorldRegion, filter: ShowcaseFilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'india') return !region.isInternational;
  if (filter === 'international') return Boolean(region.isInternational);

  const explicitTags = REGION_CATEGORY_TAGS[region.id];
  if (explicitTags && explicitTags.includes(filter)) {
    return true;
  }

  // Also check underlying destination tags & categories dynamically
  const allText = [
    region.tagline,
    ...region.destinations.flatMap((d) => [d.category, d.shortDescription, ...d.tags]),
  ]
    .join(' ')
    .toLowerCase();

  switch (filter) {
    case 'beaches':
      return allText.includes('beach') || allText.includes('coast') || allText.includes('sea');
    case 'mountains':
      return (
        allText.includes('hill') ||
        allText.includes('valley') ||
        allText.includes('mountain') ||
        allText.includes('ghat')
      );
    case 'historical':
      return (
        allText.includes('heritage') ||
        allText.includes('fort') ||
        allText.includes('palace') ||
        allText.includes('temple') ||
        allText.includes('monument')
      );
    case 'adventure':
      return (
        allText.includes('adventure') ||
        allText.includes('safari') ||
        allText.includes('water') ||
        allText.includes('cave') ||
        allText.includes('trek')
      );
    case 'nature':
      return (
        allText.includes('nature') ||
        allText.includes('island') ||
        allText.includes('park') ||
        allText.includes('garden') ||
        allText.includes('lake')
      );
    case 'cities':
      return region.destinations.length >= 3;
    default:
      return true;
  }
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

  useEffect(() => {
    try {
      localStorage.setItem('travelmate_favorite_regions', JSON.stringify(favorites));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, regionId: string) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(regionId) ? prev.filter((id) => id !== regionId) : [...prev, regionId]
    );
  };

  const displayedRegions = ALL_REGIONS.filter((region) => {
    if (!matchesRegionFilter(region, filterType)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        region.name.toLowerCase().includes(q) ||
        region.state.toLowerCase().includes(q) ||
        (region.country && region.country.toLowerCase().includes(q)) ||
        region.tagline.toLowerCase().includes(q) ||
        region.destinations.some((d) => d.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const match = ALL_REGIONS.find(
      (r) =>
        r.name.toLowerCase() === searchQuery.trim().toLowerCase() ||
        r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    if (match) {
      onSelectRegion(match);
    } else {
      onSearchCustomCity(searchQuery.trim());
    }
  };

  const filterButtons: Array<{
    id: ShowcaseFilterType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'all', label: 'All destinations', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'india', label: 'India', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'international', label: 'International', icon: <Globe2 className="w-3.5 h-3.5" /> },
    { id: 'beaches', label: 'Beaches', icon: <Palmtree className="w-3.5 h-3.5" /> },
    { id: 'mountains', label: 'Mountains', icon: <Mountain className="w-3.5 h-3.5" /> },
    { id: 'historical', label: 'Historical places', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'adventure', label: 'Adventure', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'nature', label: 'Nature', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'cities', label: 'Cities', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  const quickSuggestions = ['Goa', 'Paris', 'Jaipur', 'Tokyo', 'Dubai', 'Kerala', 'Rome', 'Bali'];

  return (
    <div className="space-y-8">
      {/* Immersive Travel Discovery Hero Section */}
      <section className="relative rounded-[2rem] overflow-hidden bg-[#101828] text-white shadow-[0_24px_60px_-15px_rgba(16,24,40,0.35)] border border-white/10">
        {/* Curated High-Res Travel Backdrop with Multi-Stop Dark Readability Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1800&q=85"
            alt="Scenic mountain lake travel landscape"
            className="w-full h-full object-cover object-center opacity-45 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101828] via-[#101828]/85 to-[#101828]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101828] via-transparent to-[#101828]/40" />
        </div>

        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 max-w-5xl">
          {/* AI Companion Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold tracking-wide text-white mb-5">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            <span>AI-POWERED WORLDWIDE TRAVEL DISCOVERY</span>
          </div>

          {/* Confident Display Headline */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
            Your next adventure{' '}
            <span className="bg-gradient-to-r from-[#8067F5] via-[#A78BFA] to-[#14B8A6] bg-clip-text text-transparent">
              starts here.
            </span>
          </h1>

          {/* Supporting Subheadline */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 mt-4 max-w-2xl leading-relaxed font-normal">
            Discover extraordinary destinations, plan smarter journeys, and travel confidently with your AI companion.
          </p>

          {/* Prominent Worldwide Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 bg-white/95 backdrop-blur-xl p-2 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-3xl"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-[#5145E5] ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any destination, city, or landmark worldwide (e.g., Goa, Paris, Tokyo, Bali)..."
                className="w-full bg-transparent pl-3 pr-4 py-3 text-sm font-medium text-[#101828] placeholder:text-[#64748B] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3.5 bg-brand-gradient text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-[#5145E5]/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isSearching ? 'Discovering with AI...' : 'Explore with AI'}</span>
            </button>
          </form>

          {/* Popular Destination Suggestions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 mr-1">Popular right now:</span>
            {quickSuggestions.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  const preset = ALL_REGIONS.find(
                    (r) => r.name.toLowerCase() === place.toLowerCase()
                  );
                  if (preset) {
                    onSelectRegion(preset);
                  } else {
                    setSearchQuery(place);
                    onSearchCustomCity(place);
                  }
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
              >
                {place}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Functional Destination Filter Bar & Section Header */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#5145E5]">
              Curated Global Hubs
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-[#101828] tracking-tight mt-0.5">
              Explore Extraordinary Destinations
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium">
            Showing <strong className="text-[#101828]">{displayedRegions.length}</strong> verified destination circuits
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filterButtons.map((btn) => {
            const active = filterType === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterType(btn.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#101828] text-white border-[#101828] shadow-md shadow-[#101828]/15'
                    : 'bg-white text-[#64748B] border-[#E8EAF2] hover:text-[#101828] hover:border-[#5145E5]/30 hover:bg-white'
                }`}
              >
                <span className={active ? 'text-[#14B8A6]' : 'text-[#5145E5]'}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Redesigned Destination Discovery Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedRegions.map((region) => {
            const primaryCover =
              REGION_COVER_IMAGES[region.id] ||
              region.destinations[0]?.imageUrl ||
              FALLBACK_DESTINATION_COVER;
            const imgSrc = failedImages[region.id] ? FALLBACK_DESTINATION_COVER : primaryCover;
            const isFav = favorites.includes(region.id);
            const countryName = region.country || (region.isInternational ? 'International' : 'India');
            const attractionCount = region.destinations.length;
            const bestSeasonHint = region.destinations[0]?.bestTimeToVisit?.split('(')[0]?.trim();

            return (
              <article
                key={region.id}
                onClick={() => onSelectRegion(region)}
                className="luxury-card group overflow-hidden flex flex-col justify-between cursor-pointer h-full"
              >
                {/* Immersive Photograph Container */}
                <div>
                  <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={`${region.name}, ${countryName}`}
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [region.id]: true }))
                      }
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/80 via-[#101828]/20 to-transparent pointer-events-none" />

                    {/* Top Left Country Pill */}
                    <div className="absolute top-3.5 left-3.5 bg-[#101828]/65 backdrop-blur-md text-white border border-white/15 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#14B8A6]" />
                      <span>{countryName}</span>
                    </div>

                    {/* Top Right Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, region.id)}
                      aria-label={`Favorite ${region.name}`}
                      className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
                        isFav
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                          : 'bg-black/35 text-white/90 border-white/20 hover:bg-black/55'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                    </button>

                    {/* Bottom Image Overlay: Destination Name & State */}
                    <div className="absolute bottom-3.5 left-4 right-4 text-white pointer-events-none">
                      <span className="text-[11px] font-semibold text-white/80 tracking-wide block">
                        {region.state}
                      </span>
                      <h3 className="font-display text-xl font-black tracking-tight text-white leading-snug">
                        {region.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 pb-4">
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {region.tagline}
                    </p>

                    {/* Real Data Metadata Row */}
                    <div className="mt-4 pt-3.5 border-t border-[#E8EAF2] flex items-center justify-between gap-2 text-xs">
                      {attractionCount > 0 && (
                        <span className="font-bold text-[#101828] bg-[#F7F8FC] border border-[#E8EAF2] px-2.5 py-1 rounded-lg">
                          {attractionCount} {attractionCount === 1 ? 'attraction' : 'attractions'}
                        </span>
                      )}

                      {bestSeasonHint && (
                        <span className="text-[11px] font-medium text-[#64748B] flex items-center gap-1 truncate">
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{bestSeasonHint}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clean Card Footer Action */}
                <div className="px-5 pb-5 pt-1">
                  <div className="w-full py-2.5 px-4 rounded-xl bg-[#F7F8FC] group-hover:bg-brand-gradient text-[#101828] group-hover:text-white font-bold text-xs flex items-center justify-between transition-all duration-300 border border-[#E8EAF2] group-hover:border-transparent">
                    <span>Explore Destination</span>
                    <ArrowUpRight className="w-4 h-4 text-[#5145E5] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Empty Filter / Search Fallback */}
        {displayedRegions.length === 0 && (
          <div className="text-center py-14 px-6 bg-white rounded-3xl border border-[#E8EAF2] shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#5145E5]/10 text-[#5145E5] flex items-center justify-center mx-auto mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-[#101828] text-base">
              {searchQuery
                ? `Discover "${searchQuery}" with Google Gemini AI`
                : 'No preset destinations match this filter'}
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 max-w-md mx-auto">
              {searchQuery
                ? 'Our AI travel engine can synthesize real-time sights, coordinates, and admission budgets for any city on Earth.'
                : 'Try switching to All destinations or search any custom city above.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchCustomCity(searchQuery.trim())}
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-brand-gradient text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSearching ? 'Discovering...' : `Explore "${searchQuery}" via AI`}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 bg-[#F7F8FC] hover:bg-slate-200/70 text-[#101828] border border-[#E8EAF2] rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
