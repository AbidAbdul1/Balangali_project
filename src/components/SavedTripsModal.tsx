import React from 'react';
import { ItineraryPlan } from '../types/travel';
import { getDestinationImageUrl, CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import { Bookmark, Trash2, ArrowRight, X, MapPin, Wallet } from 'lucide-react';

interface SavedTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTrips: ItineraryPlan[];
  onLoadTrip: (trip: ItineraryPlan) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const SavedTripsModal: React.FC<SavedTripsModalProps> = ({
  isOpen,
  onClose,
  savedTrips,
  onLoadTrip,
  onDeleteTrip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#343A36]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl max-w-3xl w-full border border-[#E6E2D8] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        {/* Editorial Header */}
        <div className="px-6 py-5 border-b border-[#E6E2D8] flex items-center justify-between bg-[#F7F5EF]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91A995] block">
              Personal Travel Archive
            </span>
            <h2 className="font-display text-xl font-semibold text-[#343A36]">
              Saved Trips ({savedTrips.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[#858B84] hover:text-[#343A36] rounded-full hover:bg-[#FFFFFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of saved trips */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#F7F5EF] flex-1">
          {savedTrips.length === 0 ? (
            <div className="text-center py-12 bg-[#FFFFFF] rounded-2xl border border-[#E6E2D8] p-6 space-y-2">
              <Bookmark className="w-8 h-8 text-[#91A995] mx-auto" />
              <p className="font-display text-base font-semibold text-[#343A36]">
                No saved itineraries yet
              </p>
              <p className="text-xs text-[#858B84] max-w-sm mx-auto">
                Build your multi-day itinerary in My Trips and click &ldquo;Save trip&rdquo; to access it anytime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedTrips.map((trip) => {
                const formattedDate = new Date(
                  trip.updatedAt || trip.createdAt
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const firstDest = trip.days
                  ?.flatMap((d) => d.items)
                  ?.map((i) => i.destination)?.[0];
                const coverImg = firstDest
                  ? getDestinationImageUrl(firstDest)
                  : CATEGORY_FALLBACK_IMAGES['All'];

                return (
                  <article
                    key={trip.id}
                    className="overflow-hidden flex flex-col justify-between bg-[#FFFFFF] rounded-2xl border border-[#E6E2D8] hover:border-[#243C32] transition-colors"
                  >
                    <div>
                      {/* Destination Cover Image */}
                      <div className="relative h-36 w-full bg-[#EFECE4] overflow-hidden">
                        <img
                          src={coverImg}
                          alt={trip.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              CATEGORY_FALLBACK_IMAGES['All'];
                          }}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-[#FFFFFF]/90 text-[#343A36] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                          {trip.days.length} {trip.days.length === 1 ? 'Day' : 'Days'} · {trip.totalDestinations} Stops
                        </div>
                      </div>

                      {/* Trip Metadata */}
                      <div className="p-4 space-y-1.5">
                        <span className="text-[11px] text-[#858B84] block">
                          Saved {formattedDate}
                        </span>
                        <h4 className="font-display text-base font-semibold text-[#343A36] truncate">
                          {trip.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#858B84] truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#91A995] shrink-0" />
                          <span className="truncate">Origin: {trip.startingLocation.name.split(',')[0]}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6E2D8]">
                          <span className="text-[#858B84] flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5 text-[#91A995]" />
                            <span>Target Budget:</span>
                          </span>
                          <span className="font-semibold text-[#343A36]">
                            ₹{trip.totalEstimatedBudgetINR.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onDeleteTrip(trip.id)}
                        className="p-2 text-[#858B84] hover:text-[#D68B65] rounded-full transition-colors"
                        title="Delete saved trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onLoadTrip(trip);
                          onClose();
                        }}
                        className="flex-1 py-2 px-4 text-xs font-medium text-[#FFFFFF] bg-[#243C32] hover:bg-[#1B2E26] rounded-full transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Open trip</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedTripsModal;
