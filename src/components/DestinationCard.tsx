import React, { useState, useEffect } from 'react';
import { Destination, ScoredDestination } from '../types/travel';
import { useLanguage } from '../context/LanguageContext';
import { getDestinationImageUrl, CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import {
  Navigation,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Sun,
  Sparkles,
  Clock,
  Heart,
} from 'lucide-react';

interface DestinationCardProps {
  destination: Destination;
  scoredData?: ScoredDestination;
  isSelected?: boolean;
  onSelect: () => void;
  onCalculateRoute: () => void;
  onAddToItinerary: () => void;
  isInItinerary?: boolean;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  scoredData,
  isSelected = false,
  onSelect,
  onCalculateRoute,
  onAddToItinerary,
  isInItinerary = false,
}) => {
  const { t, currencySymbol } = useLanguage();
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(() => getDestinationImageUrl(destination));
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('travelmate_favorite_spots');
      const ids: string[] = saved ? JSON.parse(saved) : [];
      return ids.includes(destination.id);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setImgSrc(getDestinationImageUrl(destination));
  }, [destination.id, destination.imageUrl]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        const saved = localStorage.getItem('travelmate_favorite_spots');
        const ids: string[] = saved ? JSON.parse(saved) : [];
        const updated = next
          ? Array.from(new Set([...ids, destination.id]))
          : ids.filter((id) => id !== destination.id);
        localStorage.setItem('travelmate_favorite_spots', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const formatReviewCount = (num: number) => {
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
  };

  return (
    <article
      className={`luxury-card group overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'border-[#5145E5] ring-2 ring-[#5145E5]/20 shadow-lg'
          : ''
      }`}
    >
      <div>
        {/* Photo Container with Gradient Scrim & Favorite Action */}
        <div
          className="relative h-52 w-full bg-slate-100 overflow-hidden cursor-pointer"
          onClick={onSelect}
        >
          <img
            src={imgSrc}
            alt={destination.name}
            referrerPolicy="no-referrer"
            onError={() => {
              const fallback =
                CATEGORY_FALLBACK_IMAGES[destination.category] || CATEGORY_FALLBACK_IMAGES['All'];
              if (imgSrc !== fallback) {
                setImgSrc(fallback);
              }
            }}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          {/* Elegant Scrim Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/80 via-[#101828]/20 to-transparent pointer-events-none" />

          {/* Top Left Badge: Score or AI Tag */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 pointer-events-none">
            {scoredData ? (
              <div className="bg-[#101828]/80 backdrop-blur-md text-white border border-white/15 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 shadow-xs">
                <span className="text-[#14B8A6]">★</span>
                <span>{scoredData.scores.finalScore}</span>
                <span className="text-white/60 font-normal text-[10px]">/100</span>
              </div>
            ) : destination.isAiDiscovered ? (
              <div className="bg-brand-gradient text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-white" />
                <span>AI Verified</span>
              </div>
            ) : null}
          </div>

          {/* Top Right Favorite Toggle */}
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={`Favorite ${destination.name}`}
            className={`absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                : 'bg-black/35 text-white/90 border-white/20 hover:bg-black/55'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
          </button>

          {/* Bottom Overlay Info inside the Scrim */}
          <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-white pointer-events-none">
            <div className="flex items-center gap-2 text-xs font-medium text-white/95">
              <span className="tracking-wide uppercase text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/15">
                {destination.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-white/85">
                <Sun className="w-3 h-3 text-amber-400" />
                <span>{destination.isOutdoor ? 'Outdoor' : 'Indoor'}</span>
              </span>
            </div>

            {destination.estimatedDurationMin > 0 && (
              <div className="text-xs font-mono font-semibold text-white/95 flex items-center gap-1 bg-black/35 backdrop-blur-md px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-[#14B8A6]" />
                <span>{destination.estimatedDurationMin}m</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Rating & Review Counter Line (Only shown when real rating > 0) */}
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1.5">
            {destination.rating > 0 && (
              <>
                <span className="font-bold text-amber-600 flex items-center gap-0.5">
                  <span>★</span>
                  <span>{destination.rating}</span>
                </span>
                {destination.reviewsCount > 0 && (
                  <span className="text-[#64748B] font-mono text-[11px]">
                    ({formatReviewCount(destination.reviewsCount)} reviews)
                  </span>
                )}
                <span className="text-slate-300">·</span>
              </>
            )}
            <span className="text-[#64748B] text-[11px] truncate">
              {destination.bestTimeToVisit}
            </span>
          </div>

          {/* Destination Name */}
          <h3
            onClick={onSelect}
            className="font-display text-base sm:text-lg font-extrabold text-[#101828] leading-snug cursor-pointer hover:text-[#5145E5] transition-colors tracking-tight"
          >
            {destination.name}
          </h3>

          <p className="text-xs text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
            {destination.shortDescription}
          </p>

          {/* Gemini AI Insider Highlights */}
          {destination.aiHighlights && (
            <div className="mt-3 p-3 bg-[#F7F8FC] border-l-2 border-[#5145E5] rounded-r-xl text-xs text-[#101828]">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#5145E5] shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-[#101828]">Local Insight: </span>
                  <span className="text-[#64748B]">{destination.aiHighlights}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Facts: Entry Fee & Hours */}
          <div className="mt-4 pt-3.5 border-t border-[#E8EAF2] grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">
                {t('entryFee', 'Entry Fee')}
              </span>
              <span className="font-bold text-[#101828] font-mono text-xs mt-0.5 block">
                {destination.feeINR === 0
                  ? t('freeAdmission', 'Free Entry')
                  : `${currencySymbol}${destination.feeINR} ${t('perPerson', '/ person')}`}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[10px] uppercase font-bold tracking-wider">
                {t('openingHours', 'Hours')}
              </span>
              <span
                className="font-medium text-[#101828] text-xs mt-0.5 block truncate"
                title={destination.openingHours}
              >
                {destination.openingHours}
              </span>
            </div>
          </div>

          {/* Transparent Scoring Details (If Scored) */}
          {scoredData && (
            <div className="mt-3.5 p-3 bg-[#F7F8FC] rounded-2xl border border-[#E8EAF2] text-xs">
              <div className="flex items-center justify-between text-[#101828] font-medium">
                <span className="text-[11px] text-[#5145E5] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#5145E5]" />
                  <span>AI Match Breakdown</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                  className="text-[#5145E5] text-[11px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Details</span>
                  {showScoreBreakdown ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              <p className="text-[#64748B] text-[11px] mt-1 leading-relaxed">
                {scoredData.explanation}
              </p>

              {showScoreBreakdown && (
                <div className="mt-2.5 pt-2.5 border-t border-[#E8EAF2] grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Interests:</span>
                    <span className="font-bold text-[#101828]">
                      {scoredData.scores.preferenceMatch}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Budget:</span>
                    <span className="font-bold text-[#101828]">
                      {scoredData.scores.budgetSuitability}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Transit:</span>
                    <span className="font-bold text-[#101828]">
                      {scoredData.scores.travelTimeSuitability}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Weather:</span>
                    <span className="font-bold text-[#101828]">
                      {scoredData.scores.weatherSuitability}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ride-Hailing Quick Estimates */}
          {scoredData && scoredData.distanceFromOriginKm > 0 && (
            <div className="mt-3 pt-2.5 border-t border-[#E8EAF2] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
              <span>Est. Ride:</span>
              <div className="flex items-center gap-3">
                <span className="text-[#101828] font-bold">
                  Cab ~{currencySymbol}
                  {Math.max(
                    75,
                    Math.round(
                      45 +
                        scoredData.distanceFromOriginKm * 14.5 +
                        scoredData.estimatedTravelTimeMin * 1.5 +
                        18
                    )
                  )}
                </span>
                <span className="text-[#101828] font-bold">
                  Bike ~{currencySymbol}
                  {Math.max(
                    25,
                    Math.round(20 + Math.max(0, scoredData.distanceFromOriginKm - 1.5) * 9 + 4)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="p-5 pt-0 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCalculateRoute}
          className="flex-1 py-2.5 px-3 bg-[#F7F8FC] hover:bg-slate-200/70 text-[#101828] border border-[#E8EAF2] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Calculate route and traffic conditions from origin"
        >
          <Navigation className="w-3.5 h-3.5 text-[#5145E5]" />
          <span>{t('calculateRoute', 'Route & Traffic')}</span>
        </button>

        <button
          type="button"
          onClick={onAddToItinerary}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 ${
            isInItinerary
              ? 'bg-[#14B8A6] hover:bg-teal-600 text-white shadow-[#14B8A6]/20'
              : 'bg-brand-gradient text-white shadow-[#5145E5]/20'
          }`}
          title="Add destination to active itinerary plan"
        >
          {isInItinerary ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{t('addedToPlan', 'In Plan')}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addToPlan', 'Add to Plan')}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
