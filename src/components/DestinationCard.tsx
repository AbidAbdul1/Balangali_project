import React, { useState, useEffect } from 'react';
import { Destination, ScoredDestination } from '../types/travel';
import { useLanguage } from '../context/LanguageContext';
import { getDestinationImageUrl, CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import {
  MapPin,
  Clock,
  Star,
  Plus,
  Check,
  Navigation,
  ChevronDown,
  ChevronUp,
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
  const { currencySymbol } = useLanguage();
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
  }, [destination]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        const saved = localStorage.getItem('travelmate_favorite_spots');
        const ids: string[] = saved ? JSON.parse(saved) : [];
        const updated = next ? [...new Set([...ids, destination.id])] : ids.filter((id) => id !== destination.id);
        localStorage.setItem('travelmate_favorite_spots', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer py-5 border-b border-[#E6E2D8] transition-colors ${
        isSelected ? 'bg-[#FFFFFF]/80 px-4 -mx-4 rounded-2xl border-transparent' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Clean Editorial Thumbnail */}
        <div className="relative w-full sm:w-44 aspect-[16/10] sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#EFECE4] shrink-0">
          <img
            src={imgSrc}
            alt={destination.name}
            loading="lazy"
            onError={() => {
              const fallback = CATEGORY_FALLBACK_IMAGES[destination.category] || CATEGORY_FALLBACK_IMAGES['All'];
              if (imgSrc !== fallback) setImgSrc(fallback);
            }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? 'Remove favorite' : 'Save spot'}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#FFFFFF]/90 flex items-center justify-center"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#D68B65] text-[#D68B65]' : 'text-[#343A36]'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium text-[#91A995] uppercase tracking-wider">
                {destination.category}
              </span>
              <h3 className="font-display text-base sm:text-lg font-semibold text-[#343A36] leading-snug">
                {destination.name}
              </h3>
            </div>

            {scoredData && (
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold text-[#243C32]">
                  {Math.round(scoredData.scores.finalScore)}%
                </span>
                <span className="block text-[11px] text-[#858B84]">match</span>
              </div>
            )}
          </div>

          <p className="text-sm text-[#858B84] line-clamp-2 leading-relaxed">
            {destination.shortDescription || destination.description}
          </p>

          {/* Subtle Metadata Line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#858B84] pt-0.5">
            {destination.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-[#343A36] font-medium">
                <Star className="w-3.5 h-3.5 fill-[#D68B65] text-[#D68B65]" />
                {destination.rating.toFixed(1)}
                {destination.reviewsCount > 0 && (
                  <span className="text-[#858B84] font-normal">({destination.reviewsCount.toLocaleString()})</span>
                )}
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {Math.round(destination.estimatedDurationMin / 60 * 10) / 10}h visit
            </span>

            <span>
              {destination.feeINR > 0 ? `${currencySymbol}${destination.feeINR}` : 'Free entry'}
            </span>

            {scoredData && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#91A995]" />
                {scoredData.distanceFromOriginKm.toFixed(1)} km · {scoredData.weatherSuitabilityStatus}
              </span>
            )}
          </div>

          {/* Minimal Actions Row */}
          <div className="flex flex-wrap items-center gap-4 pt-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToItinerary();
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isInItinerary
                  ? 'bg-[#91A995]/20 text-[#243C32]'
                  : 'bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF]'
              }`}
            >
              {isInItinerary ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isInItinerary ? 'In itinerary' : 'Add to trip'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCalculateRoute();
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#343A36] hover:text-[#243C32]"
            >
              <Navigation className="w-3.5 h-3.5 text-[#91A995]" />
              <span>Route</span>
            </button>

            {scoredData && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowScoreBreakdown((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 text-xs text-[#858B84] hover:text-[#343A36]"
              >
                <span>Why recommended</span>
                {showScoreBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {showScoreBreakdown && scoredData && (
            <div className="mt-2 pt-3 border-t border-[#E6E2D8] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="block text-[#858B84]">Interests</span>
                <span className="font-semibold text-[#343A36]">{Math.round(scoredData.scores.preferenceMatch)}/100</span>
              </div>
              <div>
                <span className="block text-[#858B84]">Budget fit</span>
                <span className="font-semibold text-[#343A36]">{Math.round(scoredData.scores.budgetSuitability)}/100</span>
              </div>
              <div>
                <span className="block text-[#858B84]">Transit ease</span>
                <span className="font-semibold text-[#343A36]">{Math.round(scoredData.scores.travelTimeSuitability)}/100</span>
              </div>
              <div>
                <span className="block text-[#858B84]">Weather</span>
                <span className="font-semibold text-[#343A36]">{Math.round(scoredData.scores.weatherSuitability)}/100</span>
              </div>
              {scoredData.explanation && (
                <p className="col-span-full text-xs text-[#858B84]">{scoredData.explanation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default DestinationCard;
