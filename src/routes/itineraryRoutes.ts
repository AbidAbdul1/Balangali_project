/**
 * Smart Itinerary Regeneration, Dynamic Rescheduling & Weather-Aware Routes
 */
import { Router, Request, Response } from 'express';
import { Destination, ItineraryDay, ItineraryItem, ItineraryPlan, ReschedulePreview } from '../types/travel.ts';

export const itineraryRouter = Router();

function parseStartMin(timeSlot: string): number {
  const m = (timeSlot || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 9 * 60;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatMin(totalMin: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function recomputeDayMetrics(day: ItineraryDay, origin: { latitude: number; longitude: number }): ItineraryDay {
  let totalDist = 0;
  let totalDur = 0;
  let prev = origin;

  const updatedItems = day.items.map((item, idx) => {
    const dist = haversineKm(prev, item.destination);
    const travelMin = Math.max(8, Math.round((dist / 28) * 60));
    totalDist += dist;
    totalDur += (item.durationMin || 60) + travelMin;
    prev = item.destination;
    return {
      ...item,
      order: idx + 1,
      dayNumber: day.dayNumber,
      travelDistanceFromPreviousKm: Number(dist.toFixed(1)),
      travelTimeFromPreviousMin: travelMin,
    };
  });

  return {
    ...day,
    items: updatedItems,
    totalDistanceKm: Number(totalDist.toFixed(1)),
    totalDurationMin: totalDur,
  };
}

/**
 * POST /api/itineraries/regenerate
 * Regenerates a specific day or replaces an attraction while preserving other days,
 * confirmed bookings, and user notes.
 */
itineraryRouter.post('/itineraries/regenerate', (req: Request, res: Response) => {
  try {
    const plan: ItineraryPlan = req.body?.plan;
    const dayNumber: number = Number(req.body?.dayNumber || 1);
    const replaceItemId: string | undefined = req.body?.replaceItemId;
    const candidatePool: Destination[] = Array.isArray(req.body?.candidatePool) ? req.body.candidatePool : [];
    const budgetMode: string | undefined = req.body?.budgetMode;

    if (!plan || !Array.isArray(plan.days)) {
      return res.status(400).json({ success: false, error: 'Valid itinerary plan is required.' });
    }

    const usedIds = new Set<string>();
    plan.days.forEach((d) =>
      d.items.forEach((it) => {
        if (it.id !== replaceItemId) usedIds.add(it.destination.id);
      })
    );

    const availableAlternatives = candidatePool.filter((d) => !usedIds.has(d.id));
    let altCursor = 0;

    const updatedDays = plan.days.map((day) => {
      if (day.dayNumber !== dayNumber) return day;

      // Single item replacement
      if (replaceItemId) {
        const newItems = day.items.map((item) => {
          if (item.id !== replaceItemId || item.isConfirmed) return item;
          const replacement =
            availableAlternatives[altCursor++] ||
            candidatePool.find((d) => d.id !== item.destination.id);
          if (!replacement) return item;
          return {
            ...item,
            destination: replacement,
            userNotes: item.userNotes
              ? `${item.userNotes} (Swapped from ${item.destination.name})`
              : `Replaced ${item.destination.name} with ${replacement.name}`,
          };
        });
        return recomputeDayMetrics({ ...day, items: newItems }, plan.startingLocation);
      }

      // Regenerate full day: keep confirmed items, refresh unconfirmed slots
      const confirmed = day.items.filter((i) => i.isConfirmed);
      const unconfirmedCount = Math.max(0, day.items.length - confirmed.length);
      const freshItems: ItineraryItem[] = [...confirmed];

      let cursorMin = 9 * 60;
      for (let i = 0; i < unconfirmedCount; i++) {
        // Pick budget-friendly if requested
        let pool = availableAlternatives.slice(altCursor);
        if (budgetMode === 'budget') {
          pool = [...pool].sort((a, b) => (a.feeINR || 0) - (b.feeINR || 0));
        }
        const nextDest = pool[0];
        if (!nextDest) break;
        altCursor++;
        usedIds.add(nextDest.id);

        // Skip lunch slot around 13:00
        if (cursorMin >= 12 * 60 + 30 && cursorMin < 13 * 60 + 30) {
          cursorMin = 13 * 60 + 45;
        }
        const dur = nextDest.estimatedDurationMin || 75;
        freshItems.push({
          id: `regen-${dayNumber}-${Date.now()}-${i}`,
          destination: nextDest,
          order: freshItems.length + 1,
          dayNumber,
          timeSlot: `${formatMin(cursorMin)} - ${formatMin(cursorMin + dur)}`,
          durationMin: dur,
          activityType: 'attraction',
          userNotes: `Smart-regenerated for Day ${dayNumber}${budgetMode ? ` (${budgetMode} focus)` : ''}`,
        });
        cursorMin += dur + 30;
      }

      // Sort by start time
      freshItems.sort((a, b) => parseStartMin(a.timeSlot) - parseStartMin(b.timeSlot));
      return recomputeDayMetrics({ ...day, items: freshItems }, plan.startingLocation);
    });

    const totalDestinations = updatedDays.reduce((sum, d) => sum + d.items.length, 0);
    const totalBudget = updatedDays.reduce(
      (sum, d) => sum + d.items.reduce((s, it) => s + (it.destination.feeINR || 0) + (it.travelCostINR || 45), 0),
      0
    );

    return res.json({
      success: true,
      plan: {
        ...plan,
        days: updatedDays,
        totalDestinations,
        totalEstimatedBudgetINR: Math.round(totalBudget),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Regeneration failed.' });
  }
});

/**
 * POST /api/itineraries/reschedule
 * Dynamic Trip Rescheduler: computes a preview diff before applying.
 */
itineraryRouter.post('/itineraries/reschedule', (req: Request, res: Response) => {
  try {
    const plan: ItineraryPlan = req.body?.plan;
    const dayNumber: number = Number(req.body?.dayNumber || 1);
    const scenario: string = String(req.body?.scenario || 'arrived-late');
    const delayMinutes: number = Number(req.body?.delayMinutes || 90);
    const targetItemId: string | undefined = req.body?.targetItemId;
    const candidatePool: Destination[] = Array.isArray(req.body?.candidatePool) ? req.body.candidatePool : [];

    if (!plan || !Array.isArray(plan.days)) {
      return res.status(400).json({ success: false, error: 'Valid itinerary plan is required.' });
    }

    const preservedBookings: string[] = [];
    const changes: ReschedulePreview['changes'] = [];

    const proposedDays = plan.days.map((day) => {
      if (day.dayNumber !== dayNumber) return day;

      const usedIds = new Set(day.items.map((i) => i.destination.id));
      const indoorAlts = candidatePool.filter((d) => !d.isOutdoor && !usedIds.has(d.id));
      const generalAlts = candidatePool.filter((d) => !usedIds.has(d.id));
      let indoorIdx = 0;
      let genIdx = 0;

      const nextItems: ItineraryItem[] = [];
      let runningMin = day.items.length > 0 ? parseStartMin(day.items[0].timeSlot) : 9 * 60;

      if (scenario === 'missed-train' || scenario === 'arrived-late' || scenario === 'transport-delayed') {
        runningMin += delayMinutes;
      }

      const dayCutoffMin = scenario === 'less-time' ? 17 * 60 : 21 * 60;

      for (const item of day.items) {
        if (item.isConfirmed) {
          preservedBookings.push(`${item.destination.name} (${item.timeSlot})`);
          nextItems.push(item);
          changes.push({
            action: 'kept',
            itemName: item.destination.name,
            oldTime: item.timeSlot,
            newTime: item.timeSlot,
            reason: 'Confirmed booking preserved',
          });
          runningMin = Math.max(runningMin, parseStartMin(item.timeSlot) + (item.durationMin || 60) + 20);
          continue;
        }

        if (scenario === 'skip-activity' && item.id === targetItemId) {
          changes.push({
            action: 'skipped',
            itemName: item.destination.name,
            oldTime: item.timeSlot,
            reason: 'Skipped by traveller request; remaining stops shifted earlier',
          });
          continue;
        }

        if (scenario === 'attraction-closed' && (!targetItemId || item.id === targetItemId)) {
          const alt = generalAlts[genIdx++];
          if (alt) {
            const dur = alt.estimatedDurationMin || item.durationMin || 75;
            const newSlot = `${formatMin(runningMin)} - ${formatMin(runningMin + dur)}`;
            nextItems.push({
              ...item,
              destination: alt,
              timeSlot: newSlot,
              userNotes: `Auto-swapped because ${item.destination.name} was unavailable`,
            });
            changes.push({
              action: 'replaced',
              itemName: `${item.destination.name} -> ${alt.name}`,
              oldTime: item.timeSlot,
              newTime: newSlot,
              reason: 'Original attraction unavailable/closed',
            });
            runningMin += dur + 20;
            continue;
          }
        }

        if (scenario === 'weather-changed' && item.destination.isOutdoor) {
          const indoor = indoorAlts[indoorIdx++];
          if (indoor) {
            const dur = indoor.estimatedDurationMin || item.durationMin || 75;
            const newSlot = `${formatMin(runningMin)} - ${formatMin(runningMin + dur)}`;
            nextItems.push({
              ...item,
              destination: indoor,
              timeSlot: newSlot,
              weatherAlert: 'Swapped to indoor venue due to weather change',
            });
            changes.push({
              action: 'replaced',
              itemName: `${item.destination.name} -> ${indoor.name}`,
              oldTime: item.timeSlot,
              newTime: newSlot,
              reason: 'Outdoor stop replaced with weather-safe indoor attraction',
            });
            runningMin += dur + 20;
            continue;
          }
        }

        const dur = scenario === 'less-time' ? Math.max(45, Math.round((item.durationMin || 75) * 0.75)) : item.durationMin || 75;
        if (runningMin + dur > dayCutoffMin) {
          changes.push({
            action: 'skipped',
            itemName: item.destination.name,
            oldTime: item.timeSlot,
            reason: `Deferred due to ${scenario.replace('-', ' ')} time constraint (after ${formatMin(dayCutoffMin)})`,
          });
          continue;
        }

        const newSlot = `${formatMin(runningMin)} - ${formatMin(runningMin + dur)}`;
        if (newSlot !== item.timeSlot) {
          changes.push({
            action: 'shifted',
            itemName: item.destination.name,
            oldTime: item.timeSlot,
            newTime: newSlot,
            reason: `Schedule adjusted for ${scenario.replace('-', ' ')}`,
          });
        } else {
          changes.push({
            action: 'kept',
            itemName: item.destination.name,
            oldTime: item.timeSlot,
            newTime: newSlot,
            reason: 'Unchanged',
          });
        }

        nextItems.push({ ...item, durationMin: dur, timeSlot: newSlot });
        runningMin += dur + 20;
      }

      return recomputeDayMetrics({ ...day, items: nextItems }, plan.startingLocation);
    });

    const totalDestinations = proposedDays.reduce((s, d) => s + d.items.length, 0);
    const preview: ReschedulePreview = {
      scenario,
      summary: `Rescheduled Day ${dayNumber} for "${scenario.replace(/-/g, ' ')}" (${changes.filter((c) => c.action !== 'kept').length} adjustments, ${preservedBookings.length} confirmed bookings preserved).`,
      preservedBookings,
      changes,
      proposedPlan: {
        ...plan,
        days: proposedDays,
        totalDestinations,
        updatedAt: new Date().toISOString(),
      },
    };

    return res.json({ success: true, preview });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Rescheduling failed.' });
  }
});

