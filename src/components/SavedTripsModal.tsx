import React from 'react';
import { ItineraryPlan } from '../types/travel';
import { getDestinationImageUrl, CATEGORY_FALLBACK_IMAGES } from '../utils/destinationImages';
import { Bookmark, Calendar, Trash2, ArrowRight, X, MapPin, Wallet } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101828]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#E8EAF2] shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-fade-slide-up">
        {/* Midnight Header */}
        <div className="px-6 py-5 bg-hero-midnight text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-md">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#14B8A6] block">
                Personal Travel Archive
              </span>
              <h2 className="font-display text-lg font-black text-white tracking-tight">
                Saved Trips ({savedTrips.length})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of saved trips */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#F7F8FC] flex-1">
          {savedTrips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#E8EAF2] p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#5145E5]/10 text-[#5145E5] flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <p className="font-display text-base font-bold text-[#101828]">
                No saved itineraries yet
              </p>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                Build your multi-day itinerary in the Trip Planner and click &ldquo;Save Trip&rdquo; to access it anytime.
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
                    className="luxury-card overflow-hidden flex flex-col justify-between bg-white"
                  >
                    <div>
                      {/* Destination Cover Image */}
                      <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/80 via-[#101828]/25 to-transparent" />
                        <div className="absolute top-3 left-3 bg-[#101828]/70 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/15">
                          {trip.days.length} {trip.days.length === 1 ? 'Day' : 'Days'} ·{' '}
                          {trip.totalDestinations} Stops
                        </div>
                        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                          <span className="text-[10px] font-mono text-white/80 block">
                            Saved {formattedDate}
                          </span>
                          <h4 className="font-display text-base font-black text-white truncate">
                            {trip.title}
                          </h4>
                        </div>
                      </div>

                      {/* Trip Metadata */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#5145E5] shrink-0" />
                          <span className="truncate">Origin: {trip.startingLocation.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E8EAF2]">
                          <span className="text-[#64748B] flex items-center gap-1 font-medium">
                            <Wallet className="w-3.5 h-3.5 text-[#14B8A6]" />
                            <span>Est. Budget:</span>
                          </span>
                          <span className="font-mono font-bold text-[#101828]">
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
                        className="p-2 text-[#64748B] hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-[#E8EAF2] transition-colors cursor-pointer"
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
                        className="flex-1 py-2 px-4 text-xs font-bold text-white bg-brand-gradient rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>Open Trip</span>
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
