import React, { useState } from 'react';
import {
  ItineraryPlan,
  ItineraryItem,
  Destination,
  TravelModeOption,
  SegmentTravelMode,
  WeatherData,
  ReschedulePreview,
} from '../types/travel';
import { ItineraryCostPieChart } from './ItineraryCostPieChart';
import { RouteModeComparisonModal } from './RouteModeComparisonModal';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowUp,
  ArrowDown,
  Trash2,
  Bookmark,
  Printer,
  Sparkles,
  Sun,
  Car,
  Bus,
  Bike,
  Footprints,
  Compass,
  ArrowDownUp,
  Copy,
  Check,
  Plane,
  Train,
  Shirt,
  RotateCcw,
  Plus,
  Lock,
  Unlock,
  Undo2,
  RefreshCw,
  AlertTriangle,
  X,
  FileDown,
} from 'lucide-react';

interface ItineraryBuilderProps {
  itinerary: ItineraryPlan | null;
  onUpdateItinerary: (updated: ItineraryPlan) => void;
  onSaveItinerary: () => void;
  onFocusDestination: (dest: Destination) => void;
  isSaving: boolean;
  customBudgetAmount?: number;
  onOpenExportSheet?: () => void;
  onOpenPackingList?: () => void;
  onClearItinerary?: () => void;
  onAutoFillPlan?: () => void;
  onNavigateToExplore?: () => void;
  candidateDestinations?: Destination[];
  weatherData?: WeatherData | null;
}

export const ItineraryBuilder: React.FC<ItineraryBuilderProps> = ({
  itinerary,
  onUpdateItinerary,
  onSaveItinerary,
  onFocusDestination,
  isSaving,
  customBudgetAmount,
  onOpenExportSheet,
  onOpenPackingList,
  onClearItinerary,
  onAutoFillPlan,
  onNavigateToExplore,
  candidateDestinations = [],
  weatherData,
}) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copiedSchedule, setCopiedSchedule] = useState(false);
  const [viewDisplayMode, setViewDisplayMode] = useState<'timeline' | 'cost_chart' | 'combined'>('combined');
  const [historyStack, setHistoryStack] = useState<ItineraryPlan[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOptimizingOrder, setIsOptimizingOrder] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('13:00 - 14:00');
  const [customDuration, setCustomDuration] = useState(60);
  const [customNotes, setCustomNotes] = useState('');
  const [showRescheduler, setShowRescheduler] = useState(false);
  const [rescheduleScenario, setRescheduleScenario] = useState('arrived-late');
  const [delayMinutes, setDelayMinutes] = useState(90);
  const [reschedulePreview, setReschedulePreview] = useState<ReschedulePreview | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [comparingSegment, setComparingSegment] = useState<{
    segmentId: string;
    dayNumber: number;
    orderNumber: number;
    fromName: string;
    toName: string;
    distanceKm: number;
    currentMode?: SegmentTravelMode;
    currentTimeMin?: number;
    departureTime?: string;
  } | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const handleOpenModeComparison = (
    item: ItineraryItem,
    prevItem: ItineraryItem | null,
    dayNumber: number
  ) => {
    const fromName = prevItem
      ? prevItem.destination.name
      : itinerary?.startingLocation.name.split(',')[0].split('(')[0].trim() || 'Origin';

    const dist = item.travelDistanceFromPreviousKm || 4.2;

    setComparingSegment({
      segmentId: item.id,
      dayNumber,
      orderNumber: item.order,
      fromName,
      toName: item.destination.name,
      distanceKm: dist,
      currentMode: item.travelMode || 'driving',
      currentTimeMin: item.travelTimeFromPreviousMin || 15,
      departureTime: item.timeSlot ? item.timeSlot.split('-')[0].trim() : '09:00',
    });
    setIsComparisonModalOpen(true);
  };

  const handleSelectSegmentMode = (segmentId: string, option: TravelModeOption) => {
    if (!itinerary) return;

    const updatedDays = itinerary.days.map((day) => {
      const updatedItems = day.items.map((item) => {
        if (item.id === segmentId) {
          return {
            ...item,
            travelMode: option.mode,
            travelTimeFromPreviousMin: option.durationMin,
            travelCostINR: option.costINR,
          };
        }
        return item;
      });

      const newTotalDuration = updatedItems.reduce(
        (acc, it) => acc + it.durationMin + (it.travelTimeFromPreviousMin || 0),
        0
      );

      return {
        ...day,
        items: updatedItems,
        totalDurationMin: newTotalDuration,
      };
    });

    onUpdateItinerary({
      ...itinerary,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderModeIcon = (mode?: SegmentTravelMode) => {
    switch (mode) {
      case 'flight':
        return <Plane className="w-3.5 h-3.5 text-[#243C32]" />;
      case 'train':
        return <Train className="w-3.5 h-3.5 text-[#243C32]" />;
      case 'transit':
        return <Bus className="w-3.5 h-3.5 text-[#91A995]" />;
      case 'auto_rickshaw':
        return <Compass className="w-3.5 h-3.5 text-[#D68B65]" />;
      case 'two_wheeler':
        return <Bike className="w-3.5 h-3.5 text-[#243C32]" />;
      case 'walking':
        return <Footprints className="w-3.5 h-3.5 text-[#91A995]" />;
      case 'driving':
      default:
        return <Car className="w-3.5 h-3.5 text-[#343A36]" />;
    }
  };

  const getModeLabel = (mode?: SegmentTravelMode) => {
    switch (mode) {
      case 'flight':
        return 'Flight';
      case 'train':
        return 'Train';
      case 'transit':
        return 'Public Transit';
      case 'auto_rickshaw':
        return 'Auto-Rickshaw';
      case 'two_wheeler':
        return 'Two-Wheeler';
      case 'walking':
        return 'Walking';
      case 'driving':
      default:
        return 'Cab / Car';
    }
  };

  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 border-t border-b border-[#E6E2D8]">
        <Calendar className="w-10 h-10 text-[#91A995] mx-auto" />
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-[#343A36]">Your trip timeline is open</h3>
          <p className="text-sm text-[#858B84] max-w-md mx-auto">
            Add highlights from Explore or let our planner arrange a relaxed day-by-day route.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-2">
          {onAutoFillPlan && (
            <button
              type="button"
              onClick={onAutoFillPlan}
              className="px-5 py-2.5 rounded-full bg-[#243C32] text-[#FFFFFF] text-sm font-medium"
            >
              Auto-fill sample route
            </button>
          )}
          {onNavigateToExplore && (
            <button
              type="button"
              onClick={onNavigateToExplore}
              className="text-sm font-medium text-[#243C32] hover:underline"
            >
              Browse destinations
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentDay = itinerary.days[activeDayIndex] || itinerary.days[0];

  const commitUpdate = (updated: ItineraryPlan) => {
    setHistoryStack((prev) => [itinerary, ...prev].slice(0, 12));
    onUpdateItinerary(updated);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [previous, ...rest] = historyStack;
    setHistoryStack(rest);
    onUpdateItinerary(previous);
  };

  const handleToggleConfirm = (itemId: string) => {
    if (!currentDay) return;
    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex
        ? { ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, isConfirmed: !it.isConfirmed } : it)) }
        : d
    );
    commitUpdate({ ...itinerary, days: updatedDays, updatedAt: new Date().toISOString() });
  };

  const handleEditTimeSlot = (itemId: string, currentSlot: string) => {
    const newSlot = window.prompt('Update time slot (e.g. 10:30 - 12:00):', currentSlot);
    if (!newSlot || !newSlot.trim() || newSlot.trim() === currentSlot) return;
    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex
        ? { ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, timeSlot: newSlot.trim() } : it)) }
        : d
    );
    commitUpdate({ ...itinerary, days: updatedDays, updatedAt: new Date().toISOString() });
  };

  const handleAddCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !currentDay) return;

    const customDest: Destination = {
      id: `custom-${Date.now()}`,
      name: customTitle.trim(),
      category: 'Food & Cuisine',
      latitude: itinerary.startingLocation.latitude,
      longitude: itinerary.startingLocation.longitude,
      description: customNotes.trim() || 'Personal stop added to your day plan.',
      shortDescription: customNotes.trim() || 'Personal stop',
      rating: 0,
      reviewsCount: 0,
      feeINR: 0,
      estimatedDurationMin: customDuration,
      bestTimeToVisit: customTime,
      openingHours: customTime,
      address: itinerary.startingLocation.name,
      dataSource: 'User Added',
      isOutdoor: false,
      tags: ['Custom'],
    };

    const newItem: ItineraryItem = {
      id: `item-custom-${Date.now()}`,
      destination: customDest,
      order: currentDay.items.length + 1,
      dayNumber: currentDay.dayNumber,
      timeSlot: customTime,
      durationMin: customDuration,
      travelMode: 'driving',
      userNotes: customNotes.trim() || undefined,
      activityType: 'custom',
    };

    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex
        ? {
            ...d,
            items: [...d.items, newItem],
            totalDurationMin: d.totalDurationMin + customDuration,
          }
        : d
    );

    commitUpdate({
      ...itinerary,
      days: updatedDays,
      totalDestinations: updatedDays.reduce((sum, d) => sum + d.items.length, 0),
      updatedAt: new Date().toISOString(),
    });
    setCustomTitle('');
    setCustomNotes('');
    setShowCustomForm(false);
  };

  const handleRegenerateDay = async () => {
    if (!currentDay) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/itineraries/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: itinerary,
          dayNumber: currentDay.dayNumber,
          candidatePool: candidateDestinations,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.plan) {
        commitUpdate(data.plan);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOptimizeRouteOrder = async () => {
    if (!currentDay || currentDay.items.length < 2) return;
    setIsOptimizingOrder(true);
    try {
      const stops = currentDay.items.map((it) => ({
        itemId: it.id,
        latitude: it.destination.latitude,
        longitude: it.destination.longitude,
      }));
      const res = await fetch('/api/routes/optimize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: itinerary.startingLocation, stops }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.orderedStops)) {
        const orderMap = new Map(data.orderedStops.map((s: any, idx: number) => [s.itemId, idx]));
        const sortedItems = [...currentDay.items]
          .sort((a, b) => Number(orderMap.get(a.id) ?? 99) - Number(orderMap.get(b.id) ?? 99))
          .map((it, idx) => ({ ...it, order: idx + 1 }));
        const updatedDays = itinerary.days.map((d, idx) =>
          idx === activeDayIndex ? { ...d, items: sortedItems, totalDistanceKm: data.totalDistanceKm || d.totalDistanceKm } : d
        );
        commitUpdate({ ...itinerary, days: updatedDays, updatedAt: new Date().toISOString() });
      }
    } finally {
      setIsOptimizingOrder(false);
    }
  };

  const handlePreviewReschedule = async () => {
    if (!currentDay) return;
    setIsRescheduling(true);
    try {
      const res = await fetch('/api/itineraries/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: itinerary,
          dayNumber: currentDay.dayNumber,
          scenario: rescheduleScenario,
          delayMinutes,
          candidatePool: candidateDestinations,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReschedulePreview(data.preview);
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleApplyReschedule = () => {
    if (!reschedulePreview) return;
    commitUpdate(reschedulePreview.proposedPlan);
    setReschedulePreview(null);
    setShowRescheduler(false);
  };

  const handleMoveItem = (itemIndex: number, direction: 'up' | 'down') => {
    const items = [...currentDay.items];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];
    const reordered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex ? { ...d, items: reordered } : d
    );
    commitUpdate({ ...itinerary, days: updatedDays, updatedAt: new Date().toISOString() });
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedDays = itinerary.days.map((d, idx) => {
      if (idx !== activeDayIndex) return d;
      const filtered = d.items.filter((it) => it.id !== itemId).map((it, i) => ({ ...it, order: i + 1 }));
      return {
        ...d,
        items: filtered,
        totalDurationMin: filtered.reduce((sum, it) => sum + it.durationMin + (it.travelTimeFromPreviousMin || 0), 0),
      };
    });
    commitUpdate({
      ...itinerary,
      days: updatedDays,
      totalDestinations: updatedDays.reduce((sum, d) => sum + d.items.length, 0),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopySchedule = () => {
    const text = itinerary.days
      .map(
        (d) =>
          `Day ${d.dayNumber} (${d.date}):\n` +
          d.items.map((it) => `  • ${it.timeSlot} — ${it.destination.name}`).join('\n')
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedSchedule(true);
    setTimeout(() => setCopiedSchedule(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalStops = itinerary.days.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="space-y-8">
      {/* Editorial Journey Header */}
      <header className="pb-6 border-b border-[#E6E2D8] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            Day-by-Day Route · {itinerary.days.length} {itinerary.days.length === 1 ? 'Day' : 'Days'} · {totalStops} Stops
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#343A36]">{itinerary.title}</h2>
          <p className="text-sm text-[#858B84]">
            Starting from {itinerary.startingLocation.name.split(',')[0]}
            {customBudgetAmount ? ` · Target budget ₹${customBudgetAmount.toLocaleString()}` : ''}
          </p>
        </div>

        {/* One Primary CTA + Calm Text Controls */}
        <div className="flex flex-wrap items-center gap-4 no-print">
          <button
            type="button"
            onClick={onSaveItinerary}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save trip'}</span>
          </button>

          {onOpenExportSheet && (
            <button
              type="button"
              onClick={onOpenExportSheet}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#343A36] hover:text-[#243C32]"
            >
              <FileDown className="w-4 h-4 text-[#D68B65]" />
              <span>Export PDF</span>
            </button>
          )}

          {onOpenPackingList && (
            <button
              type="button"
              onClick={onOpenPackingList}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#343A36] hover:text-[#243C32]"
            >
              <Shirt className="w-4 h-4 text-[#91A995]" />
              <span>Packing</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySchedule}
            className="inline-flex items-center gap-1.5 text-sm text-[#858B84] hover:text-[#343A36]"
          >
            {copiedSchedule ? <Check className="w-4 h-4 text-[#243C32]" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSchedule ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-sm text-[#858B84] hover:text-[#343A36]"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </header>

      {/* Underlined Day Selector + Subtle Action Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6E2D8] no-print">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {itinerary.days.map((day, idx) => {
            const active = idx === activeDayIndex;
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`relative pb-3 text-sm whitespace-nowrap transition-colors ${
                  active ? 'text-[#243C32] font-semibold' : 'text-[#858B84] hover:text-[#343A36]'
                }`}
              >
                Day {day.dayNumber}
                <span className="ml-1.5 text-xs font-normal text-[#858B84]">({day.items.length})</span>
                {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 pb-3 text-xs">
          <div className="inline-flex items-center gap-2 text-[#858B84]">
            <button
              type="button"
              onClick={() => setViewDisplayMode('timeline')}
              className={viewDisplayMode === 'timeline' ? 'text-[#243C32] font-semibold' : 'hover:text-[#343A36]'}
            >
              Timeline
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setViewDisplayMode('combined')}
              className={viewDisplayMode === 'combined' ? 'text-[#243C32] font-semibold' : 'hover:text-[#343A36]'}
            >
              Timeline + Cost
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setViewDisplayMode('cost_chart')}
              className={viewDisplayMode === 'cost_chart' ? 'text-[#243C32] font-semibold' : 'hover:text-[#343A36]'}
            >
              Cost Chart
            </button>
          </div>

          {historyStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-[#243C32] font-medium hover:underline"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
          )}
        </div>
      </div>

      {/* Weather Notice if inclement weather on selected day */}
      {weatherData && weatherData.current.precipitationProbability > 50 && (
        <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#D68B65]/12 text-xs text-[#343A36]">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D68B65]" />
            Rain probability is {weatherData.current.precipitationProbability}%. Consider rescheduling outdoor sights.
          </span>
          <button
            type="button"
            onClick={() => {
              setRescheduleScenario('rain');
              setShowRescheduler(true);
            }}
            className="font-medium text-[#243C32] hover:underline shrink-0"
          >
            Adjust for rain
          </button>
        </div>
      )}

      {/* Day Action Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#858B84] no-print">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setShowCustomForm((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[#243C32] font-medium hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add stop or meal</span>
          </button>

          <button
            type="button"
            onClick={handleOptimizeRouteOrder}
            disabled={isOptimizingOrder || currentDay.items.length < 2}
            className="inline-flex items-center gap-1 hover:text-[#343A36] disabled:opacity-40"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>{isOptimizingOrder ? 'Optimizing...' : 'Optimize stop order'}</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerateDay}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1 hover:text-[#343A36] disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Refreshing...' : 'Refresh day'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRescheduler((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[#D68B65] font-medium hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart reschedule</span>
          </button>
        </div>

        {onClearItinerary && (
          <button
            type="button"
            onClick={onClearItinerary}
            className="inline-flex items-center gap-1 text-[#858B84] hover:text-[#D68B65]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear trip</span>
          </button>
        )}
      </div>

      {/* Add Custom Activity Form */}
      {showCustomForm && (
        <form onSubmit={handleAddCustomActivity} className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
          <input
            type="text"
            required
            placeholder="Lunch, café, or custom stop"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="sm:col-span-2 px-3 py-2 text-sm bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36] focus:outline-none focus:border-[#243C32]"
          />
          <input
            type="text"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            placeholder="13:00 - 14:00"
            className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36] focus:outline-none focus:border-[#243C32]"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={15}
              step={15}
              value={customDuration}
              onChange={(e) => setCustomDuration(Number(e.target.value))}
              className="w-20 px-2.5 py-2 text-sm bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36]"
            />
            <button type="submit" className="flex-1 py-2 px-4 rounded-full bg-[#243C32] text-[#FFFFFF] text-xs font-medium">
              Add
            </button>
            <button type="button" onClick={() => setShowCustomForm(false)} className="text-[#858B84]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Optional notes..."
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            className="sm:col-span-4 px-3 py-2 text-xs bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36] focus:outline-none"
          />
        </form>
      )}

      {/* Smart Rescheduler Panel */}
      {showRescheduler && (
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] space-y-4 no-print">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-semibold text-[#343A36]">Smart Day Rescheduler</h4>
            <button type="button" onClick={() => setShowRescheduler(false)} className="text-[#858B84]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={rescheduleScenario}
              onChange={(e) => setRescheduleScenario(e.target.value)}
              className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36]"
            >
              <option value="arrived-late">Starting late</option>
              <option value="rain">Rain / indoor fallback</option>
              <option value="relaxed">More relaxed pacing</option>
            </select>
            {rescheduleScenario === 'arrived-late' && (
              <select
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl text-[#343A36]"
              >
                <option value={60}>+1 hour delay</option>
                <option value={90}>+1.5 hours delay</option>
                <option value={120}>+2 hours delay</option>
              </select>
            )}
            <button
              type="button"
              onClick={handlePreviewReschedule}
              disabled={isRescheduling}
              className="px-4 py-2 rounded-full bg-[#243C32] text-[#FFFFFF] text-xs font-medium"
            >
              {isRescheduling ? 'Simulating...' : 'Preview changes'}
            </button>
          </div>

          {reschedulePreview && (
            <div className="pt-3 border-t border-[#E6E2D8] flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#343A36]">{reschedulePreview.summary || 'Ready to apply adjusted timings.'}</p>
              <button
                type="button"
                onClick={handleApplyReschedule}
                className="px-4 py-1.5 rounded-full bg-[#D68B65] text-[#FFFFFF] text-xs font-medium"
              >
                Apply schedule
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area: Open Vertical Timeline & Cost Chart */}
      {viewDisplayMode !== 'cost_chart' && (
        <div className="space-y-4">
          {currentDay.items.length === 0 ? (
            <p className="py-10 text-sm text-[#858B84] text-center">
              No stops scheduled for Day {currentDay.dayNumber} yet. Add stops from Explore or use Add stop above.
            </p>
          ) : (
            <ol className="relative ml-3 border-l-2 border-[#91A995] pl-7 space-y-6">
              {currentDay.items.map((item, idx) => {
                const prevItem = idx > 0 ? currentDay.items[idx - 1] : null;
                return (
                  <li key={item.id} className="relative pb-6 border-b border-[#E6E2D8] last:border-b-0">
                    {/* Sage / Forest Connector Dot */}
                    <span
                      className={`absolute -left-[35px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#F7F5EF] ${
                        item.isConfirmed ? 'bg-[#243C32]' : 'bg-[#91A995]'
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => handleEditTimeSlot(item.id, item.timeSlot)}
                            className="font-semibold text-[#D68B65] hover:underline inline-flex items-center gap-1"
                            title="Click to edit time"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.timeSlot}</span>
                          </button>

                          <span className="text-[#858B84]">{item.durationMin} mins visit</span>

                          {item.destination.feeINR > 0 && (
                            <span className="text-[#343A36] font-medium">₹{item.destination.feeINR} entry</span>
                          )}
                        </div>

                        <h3
                          onClick={() => onFocusDestination(item.destination)}
                          className="font-display text-lg font-semibold text-[#343A36] hover:text-[#243C32] cursor-pointer"
                        >
                          {item.destination.name}
                        </h3>

                        <p className="text-sm text-[#858B84] line-clamp-2">
                          {item.userNotes || item.destination.shortDescription}
                        </p>

                        {/* Transit & Route Action */}
                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#858B84]">
                          <button
                            type="button"
                            onClick={() => handleOpenModeComparison(item, prevItem, currentDay.dayNumber)}
                            className="inline-flex items-center gap-1.5 text-[#343A36] hover:text-[#243C32] font-medium"
                          >
                            {renderModeIcon(item.travelMode)}
                            <span>{getModeLabel(item.travelMode)}</span>
                            {item.travelDistanceFromPreviousKm ? (
                              <span className="text-[#858B84] font-normal">
                                · {item.travelDistanceFromPreviousKm.toFixed(1)} km ({item.travelTimeFromPreviousMin || 15} min)
                              </span>
                            ) : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => onFocusDestination(item.destination)}
                            className="inline-flex items-center gap-1 hover:text-[#343A36]"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#91A995]" />
                            <span>Show on map</span>
                          </button>
                        </div>
                      </div>

                      {/* Subtle Item Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 no-print">
                        <button
                          type="button"
                          onClick={() => handleToggleConfirm(item.id)}
                          aria-label={item.isConfirmed ? 'Unlock stop' : 'Lock stop'}
                          className={`p-1.5 rounded-full transition-colors ${
                            item.isConfirmed ? 'text-[#243C32] bg-[#91A995]/20' : 'text-[#858B84] hover:text-[#343A36]'
                          }`}
                        >
                          {item.isConfirmed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, 'up')}
                          disabled={idx === 0}
                          aria-label="Move stop up"
                          className="p-1.5 rounded-full text-[#858B84] hover:text-[#343A36] disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, 'down')}
                          disabled={idx === currentDay.items.length - 1}
                          aria-label="Move stop down"
                          className="p-1.5 rounded-full text-[#858B84] hover:text-[#343A36] disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Remove stop"
                          className="p-1.5 rounded-full text-[#858B84] hover:text-[#D68B65]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {(viewDisplayMode === 'cost_chart' || viewDisplayMode === 'combined') && (
        <div className="pt-4 border-t border-[#E6E2D8]">
          <ItineraryCostPieChart
            itinerary={itinerary}
            activeDayIndex={activeDayIndex}
            onSelectDestination={onFocusDestination}
            onOpenSegmentComparison={(itemId, dayNum) => {
              const targetDay = itinerary.days.find((d) => d.dayNumber === dayNum);
              const idx = targetDay?.items.findIndex((i) => i.id === itemId) ?? -1;
              if (targetDay && idx >= 0) {
                handleOpenModeComparison(targetDay.items[idx], idx > 0 ? targetDay.items[idx - 1] : null, dayNum);
              }
            }}
          />
        </div>
      )}

      {comparingSegment && (
        <RouteModeComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
          segmentData={comparingSegment}
          onSelectMode={handleSelectSegmentMode}
        />
      )}

      {weatherData && weatherData.current.precipitationProbability <= 50 && (
        <p className="text-xs text-[#858B84] inline-flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-[#D68B65]" />
          Forecast looks comfortable ({weatherData.current.temperatureC}°C, {weatherData.current.weatherDescription}).
        </p>
      )}
    </div>
  );
};

export default ItineraryBuilder;
