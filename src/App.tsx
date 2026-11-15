/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar, NavTab } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { PreferenceForm } from './components/PreferenceForm';
import { DestinationCard } from './components/DestinationCard';
import { WeatherWidget } from './components/WeatherWidget';
import { TrafficPredictionCard } from './components/TrafficPredictionCard';
import { ItineraryBuilder } from './components/ItineraryBuilder';
import { AIAssistantChat } from './components/AIAssistantChat';
import { EvaluationModal } from './components/EvaluationModal';
import { SavedTripsModal } from './components/SavedTripsModal';
import { TripWorkflowHeader } from './components/TripWorkflowHeader';
import { AICostEstimationCard } from './components/AICostEstimationCard';
import { TripExportModal } from './components/TripExportModal';
import { PackingListModal } from './components/PackingListModal';
import { DestinationShowcase } from './components/DestinationShowcase';
import { PopularPlaces } from './components/PopularPlaces';
import { FloatingQuickDock } from './components/FloatingQuickDock';

const NearbyDiscoveryPanel = lazy(() =>
  import('./components/NearbyDiscoveryPanel').then((m) => ({ default: m.NearbyDiscoveryPanel }))
);
const BudgetGroupPanel = lazy(() =>
  import('./components/BudgetGroupPanel').then((m) => ({ default: m.BudgetGroupPanel }))
);
const TravelVaultPanel = lazy(() =>
  import('./components/TravelVaultPanel').then((m) => ({ default: m.TravelVaultPanel }))
);
import { detectUserLocation } from './utils/locationService';
import { useLanguage } from './context/LanguageContext';
import {
  PILOT_DESTINATIONS,
  VIJAYAWADA_ORIGIN,
  WorldRegion,
  ALL_REGIONS,
} from './data/destinations';
import {
  Destination,
  DestinationCategory,
  UserPreference,
  ScoredDestination,
  WeatherData,
  RouteCalculationResult,
  TrafficPredictionResult,
  ItineraryPlan,
  CostEstimationBreakdown,
} from './types/travel';
import {
  Search,
  Calendar,
  Sparkles,
  MapPin,
  ArrowRight,
  CheckCircle,
  Compass,
  Loader2,
  RotateCcw,
  Globe,
} from 'lucide-react';

export default function App() {
  const { t, currency, currencySymbol } = useLanguage();
  const [activeTab, setActiveTab] = useState<NavTab>('explore');

  // Active Region / Destination State (null by default - user selects destination manually)
  const [selectedRegion, setSelectedRegion] = useState<WorldRegion | null>(null);

  // Core Data States (starts empty until user chooses a destination)
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DestinationCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [discoveredCityLabel, setDiscoveredCityLabel] = useState<string | null>(null);

  // User Preferences & Scoring
  const [preferences, setPreferences] = useState<UserPreference>({
    startingLocation: VIJAYAWADA_ORIGIN,
    interests: ['heritage', 'caves', 'nature'],
    budget: 'moderate',
    tripDurationDays: 1,
    travelMode: 'driving',
    departureTime: '08:30',
    scoringWeights: {
      preferenceMatch: 0.35,
      budgetSuitability: 0.25,
      travelTimeSuitability: 0.20,
      weatherSuitability: 0.20,
    },
  });

  const [recommendations, setRecommendations] = useState<ScoredDestination[]>([]);
  const [isComputingRecommendations, setIsComputingRecommendations] = useState(false);
  const [recommendationBriefing, setRecommendationBriefing] = useState<string>('');

  // Weather & Environmental State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Route & Traffic State
  const [activeRoute, setActiveRoute] = useState<RouteCalculationResult | null>(null);
  const [selectedRouteMode, setSelectedRouteMode] = useState<string>('driving');
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [trafficPrediction, setTrafficPrediction] = useState<TrafficPredictionResult | null>(null);
  const [isTrafficLoading, setIsTrafficLoading] = useState(false);

  // Itinerary Plan (starts empty so user can plan by themselves)
  const [itinerary, setItinerary] = useState<ItineraryPlan | null>(() => ({
    id: `itinerary-user`,
    title: 'Custom Travel Itinerary',
    startingLocation: VIJAYAWADA_ORIGIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDestinations: 0,
    totalEstimatedBudgetINR: 0,
    days: [
      {
        dayNumber: 1,
        date: 'Day 1',
        totalDistanceKm: 0,
        totalDurationMin: 0,
        items: [],
      },
    ],
  }));
  const [savedTrips, setSavedTrips] = useState<ItineraryPlan[]>([]);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // AI Cost Estimation State
  const [costEstimation, setCostEstimation] = useState<CostEstimationBreakdown | null>(null);
  const [isCostEstimating, setIsCostEstimating] = useState(false);
  const [travelersCount, setTravelersCount] = useState(1);
  const [travelStyle, setTravelStyle] = useState<'budget' | 'moderate' | 'luxury'>('moderate');

  // Modals & Feedback
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isSavedTripsModalOpen, setIsSavedTripsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPackingModalOpen, setIsPackingModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load: Auto-detect traveler's GPS/IP location, fetch local weather & saved trips
  useEffect(() => {
    detectUserLocation()
      .then((loc) => {
        setPreferences((prev) => ({
          ...prev,
          startingLocation: loc,
        }));
        fetchWeather(loc.latitude, loc.longitude, loc.name);
        if (loc.detectionMethod === 'windows-location-service') {
          showToast(`📍 Windows Location Locked: ${loc.name.split(',')[0]} (±${loc.accuracyMeters}m)`);
        } else if (loc.detectionMethod === 'wifi-triangulation') {
          showToast(`🎯 Wi-Fi Triangulated: ${loc.name.split(',')[0]} (±${loc.accuracyMeters}m)`);
        } else if (loc.detectionMethod === 'ip-geolocation-estimate') {
          if (loc.isCellularHotspot) {
            showToast(`📶 Mobile Hotspot Detected: ${loc.name.split(',')[0]} (Regional IP estimate)`);
          } else if (loc.isVPNOrProxy) {
            showToast(`🛡️ VPN/Proxy Detected: ${loc.name.split(',')[0]} (Regional IP estimate)`);
          } else {
            showToast(`🌐 Regional IP Estimate: ${loc.name.split(',')[0]}`);
          }
        }
      })
      .catch((err) => {
        console.warn('Location detection fallback:', err);
        fetchWeather(VIJAYAWADA_ORIGIN.latitude, VIJAYAWADA_ORIGIN.longitude, VIJAYAWADA_ORIGIN.name);
      });

    fetchSavedTrips();
  }, []);

  // Re-estimate cost when currency changes
  useEffect(() => {
    if (itinerary && itinerary.days.some((d) => d.items.length > 0)) {
      const currentPlanDests = itinerary.days.flatMap((d) => d.items.map((it) => it.destination));
      fetchCostEstimation(currentPlanDests);
    }
  }, [currency]);

  const fetchWeather = async (lat: number, lon: number, name: string) => {
    setIsWeatherLoading(true);
    try {
      const resp = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}&locationName=${encodeURIComponent(name)}`);
      const data = await resp.json();
      if (resp.ok && data.success) {
        setWeather(data);
      }
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const fetchSavedTrips = async () => {
    try {
      const resp = await fetch('/api/saved-trips');
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSavedTrips(data.trips);
      }
    } catch (err) {
      console.error('Saved trips fetch error:', err);
    }
  };

  const handleClearItinerary = () => {
    const freshDays = Array.from({ length: preferences.tripDurationDays || 1 }, (_, i) => ({
      dayNumber: i + 1,
      date: `Day ${i + 1}`,
      totalDistanceKm: 0,
      totalDurationMin: 0,
      items: [],
    }));
    setItinerary({
      id: `itinerary-${Date.now()}`,
      title: selectedRegion ? `${selectedRegion.name} Custom Plan` : 'Custom Travel Plan',
      startingLocation: preferences.startingLocation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDestinations: 0,
      totalEstimatedBudgetINR: 0,
      days: freshDays,
    });
    setCostEstimation(null);
    showToast('Plan cleared! You can now select and add your favorite spots.');
  };

  const handleAutoFillItinerary = () => {
    if (selectedRegion) {
      fetchItineraryForRegion(selectedRegion, preferences.startingLocation);
      showToast(`✨ Generated optimized itinerary for ${selectedRegion.name}!`);
    } else {
      showToast('Please select a destination city first to auto-fill an itinerary.');
    }
  };

  const fetchTrafficPrediction = async (segmentId: string, depTime: string, locName?: string) => {
    setIsTrafficLoading(true);
    try {
      const resp = await fetch('/api/traffic/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadSegmentId: segmentId,
          departureTime: depTime,
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          rainfallMm: weather?.current?.precipitationMm || 0,
          locationName: locName || selectedRegion?.name || 'Urban Core',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setTrafficPrediction(data);
      }
    } catch (err) {
      console.error('Traffic prediction error:', err);
    } finally {
      setIsTrafficLoading(false);
    }
  };

  // AI-Powered Comprehensive Cost Estimation Fetcher
  const fetchCostEstimation = async (
    destsParam?: Destination[],
    originParam?: { name: string; latitude: number; longitude: number },
    overrideParams?: {
      travelersCount?: number;
      tripDurationDays?: number;
      travelStyle?: 'budget' | 'moderate' | 'luxury';
    }
  ) => {
    const currentPlanDests =
      destsParam || (itinerary?.days.flatMap((d) => d.items.map((it) => it.destination))) || [];

    if (currentPlanDests.length === 0) {
      setCostEstimation(null);
      return;
    }

    setIsCostEstimating(true);
    try {
      const origin = originParam || preferences.startingLocation;
      const travelers = overrideParams?.travelersCount ?? travelersCount;
      const days = overrideParams?.tripDurationDays ?? preferences.tripDurationDays;
      const style = overrideParams?.travelStyle ?? travelStyle;

      const resp = await fetch('/api/cost-estimation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: currentPlanDests,
          startingLocation: origin,
          travelMode: preferences.travelMode || 'driving',
          tripDurationDays: days,
          travelersCount: travelers,
          travelStyle: style,
          currency,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setCostEstimation(data);
      }
    } catch (err) {
      console.error('Cost estimation error:', err);
    } finally {
      setIsCostEstimating(false);
    }
  };

  const regenerateItineraryForDays = async (dests: Destination[], daysCount: number) => {
    try {
      const resp = await fetch('/api/itineraries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: preferences.startingLocation,
          destinations: dests,
          tripDurationDays: daysCount,
          title: `${selectedRegion?.name || 'Custom'} ${daysCount}-Day Travel Plan`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setItinerary(data.itinerary);
        fetchCostEstimation(dests, preferences.startingLocation, { tripDurationDays: daysCount });
      }
    } catch (err) {
      console.error('Failed to regenerate itinerary for days:', err);
    }
  };

  const handleUpdateTripDuration = (days: number) => {
    const validDays = Math.max(1, Math.min(30, days));
    setPreferences((prev) => ({ ...prev, tripDurationDays: validDays }));
    if (itinerary && itinerary.days.some((d) => d.items.length > 0)) {
      const allDests = itinerary.days.flatMap((d) => d.items.map((it) => it.destination));
      regenerateItineraryForDays(allDests, validDays);
      showToast(`Days planner updated: ${validDays} day(s) scheduled.`);
    } else {
      showToast(`Trip duration set to ${validDays} day(s).`);
    }
  };

  const handleUpdateCustomBudget = (amt: number | undefined) => {
    setPreferences((prev) => ({ ...prev, customBudgetAmount: amt }));
    if (amt) {
      showToast(`Target budget set to ${currency}${amt.toLocaleString()}`);
    }
  };

  // 2. Step 1: Starting Location Selection Handler
  const handleSelectStartingLocation = (loc: { name: string; latitude: number; longitude: number }) => {
    setPreferences((prev) => ({
      ...prev,
      startingLocation: loc,
    }));
    setActiveRoute(null);
    fetchWeather(loc.latitude, loc.longitude, loc.name);

    // Refresh route for selected destination if one exists
    if (selectedDestination) {
      handleCalculateRoute(selectedDestination, loc);
    }

    // Refresh AI cost estimation with new starting point
    fetchCostEstimation(undefined, loc);
    showToast(`Starting point set to ${loc.name.split(',')[0]}!`);
  };

  const handleFocusStartingPointOnMap = () => {
    setActiveTab('explore');
    setTimeout(() => {
      const mapEl = document.getElementById('interactive-map-section');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Step 2: Destination City / Region Selection Handler
  const handleSelectDestinationRegion = (region: WorldRegion) => {
    setSelectedRegion(region);
    setDestinations(region.destinations);

    if (region.destinations.length > 0) {
      setSelectedDestination(region.destinations[0]);
      handleCalculateRoute(region.destinations[0]);
    } else {
      setSelectedDestination(null);
      setActiveRoute(null);
    }

    // Live weather for destination
    fetchWeather(region.latitude, region.longitude, `${region.name}, ${region.state}`);

    // Traffic prediction for destination corridors
    if (region.corridors && region.corridors.length > 0) {
      fetchTrafficPrediction(region.corridors[0].id, preferences.departureTime, region.name);
    }

    showToast(`✨ Selected ${region.name}! Loaded ${region.destinations.length} popular spots.`);
  };

  const fetchItineraryForRegion = async (
    region: WorldRegion,
    originLoc: { name: string; latitude: number; longitude: number }
  ) => {
    try {
      const topIds = region.destinations.slice(0, 4).map((d) => d.id);
      const resp = await fetch('/api/itineraries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originLoc,
          destinationIds: topIds,
          tripDurationDays: preferences.tripDurationDays,
          title: `${region.name} Discovery Circuit`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setItinerary(data.itinerary);
        const topDests = data.itinerary.days.flatMap((d: any) => d.items.map((it: any) => it.destination));
        fetchCostEstimation(topDests, originLoc);
      }
    } catch (err) {
      console.warn('Region itinerary generation error:', err);
    }
  };

  // Destination Search (Unconstrained across all destinations and regions when query is provided)
  const handleSearch = async (queryText: string, cat: DestinationCategory) => {
    setIsSearching(true);
    try {
      const catParam = cat !== 'All' ? `&category=${encodeURIComponent(cat)}` : '';
      const qParam = queryText ? `&q=${encodeURIComponent(queryText)}` : '';
      // When searching with a text query, do not restrict to region so user can discover places worldwide
      const regionParam = queryText.trim() ? '' : (selectedRegion ? `&regionId=${selectedRegion.id}` : '');
      const resp = await fetch(
        `/api/destinations/search?latitude=${preferences.startingLocation.latitude}&longitude=${preferences.startingLocation.longitude}${qParam}${catParam}${regionParam}`
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        setDestinations(data.destinations);
        if (data.destinations.length > 0) {
          setSelectedDestination(data.destinations[0]);
        }
        if (queryText.trim()) {
          setDiscoveredCityLabel(queryText.trim());
        } else {
          setDiscoveredCityLabel(null);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Google Gemini AI Powered Real-Time Destination Discovery
  const handleGeminiSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!q) {
      showToast('Please type a city, landmark, or region to search with Gemini AI.');
      return;
    }
    setSearchQuery(q);
    setIsAiSearching(true);
    try {
      const resp = await fetch('/api/destinations/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          category: selectedCategory,
          latitude: preferences.startingLocation.latitude,
          longitude: preferences.startingLocation.longitude,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success && data.destinations && data.destinations.length > 0) {
        setDestinations(data.destinations);
        setSelectedDestination(data.destinations[0]);
        setDiscoveredCityLabel(q);
        showToast(`✨ Discovered ${data.destinations.length} popular places for "${q}" via Google Gemini AI!`);

        // Fetch live weather for discovered destination
        if (data.destinations[0].latitude && data.destinations[0].longitude) {
          fetchWeather(data.destinations[0].latitude, data.destinations[0].longitude, `${q}`);
        }
      } else {
        showToast(`No specific Gemini results. Showing best catalog matches for "${q}".`);
        handleSearch(q, selectedCategory);
      }
    } catch (err) {
      console.error('Gemini AI search error:', err);
      showToast('Gemini AI search error, falling back to standard search.');
      handleSearch(q, selectedCategory);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleResetExplore = () => {
    setSearchQuery('');
    setDiscoveredCityLabel(null);
    setSelectedCategory('All');
    if (selectedRegion) {
      setDestinations(selectedRegion.destinations);
      if (selectedRegion.destinations.length > 0) {
        setSelectedDestination(selectedRegion.destinations[0]);
      }
      showToast(`Reset to ${selectedRegion.name} spots.`);
    } else {
      setDestinations([]);
      setSelectedDestination(null);
    }
  };

  // Calculate Route
  const handleCalculateRoute = async (
    dest: Destination,
    customOrigin?: { latitude: number; longitude: number; name: string },
    modeOverride?: string
  ) => {
    setIsRouteLoading(true);
    setSelectedDestination(dest);
    const originToUse = customOrigin || preferences.startingLocation;
    const modeToUse = modeOverride || selectedRouteMode || preferences.travelMode || 'driving';
    try {
      const resp = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originToUse,
          destination: dest,
          departureTime: preferences.departureTime,
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          travelMode: modeToUse,
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setActiveRoute(data);
        showToast(`Route (${modeToUse}): ${data.distanceKm} km (~${data.trafficAdjustedDurationMin} mins)`);
        fetchTrafficPrediction(dest.id, preferences.departureTime, dest.name);
      }
    } catch (err) {
      console.error('Route error:', err);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Step 3: Add Destination to Itinerary Plan & Trigger Real-Time Cost Estimation
  const handleAddToItinerary = (dest: Destination) => {
    if (!itinerary) {
      const newPlan: ItineraryPlan = {
        id: `itinerary-${Date.now()}`,
        title: `${selectedRegion?.name || 'Custom'} Custom Plan`,
        startingLocation: preferences.startingLocation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDestinations: 1,
        totalEstimatedBudgetINR: dest.feeINR,
        days: [
          {
            dayNumber: 1,
            date: 'Day 1',
            totalDistanceKm: 4.5,
            totalDurationMin: dest.estimatedDurationMin + 20,
            items: [
              {
                id: `item-${dest.id}`,
                destination: dest,
                order: 1,
                dayNumber: 1,
                timeSlot: '09:00 - 10:30',
                durationMin: dest.estimatedDurationMin,
                travelTimeFromPreviousMin: 15,
                travelDistanceFromPreviousKm: 4.5,
                trafficLevel: 'Low',
                userNotes: dest.bestTimeToVisit,
              },
            ],
          },
        ],
      };
      setItinerary(newPlan);
      fetchCostEstimation([dest]);
      showToast(`Added ${dest.name} to plan! AI budget calculated.`);
      return;
    }

    // Check if already in plan
    const exists = itinerary.days.some((d) => d.items.some((it) => it.destination.id === dest.id));
    if (exists) {
      // Toggle remove
      const updatedDays = itinerary.days.map((d) => ({
        ...d,
        items: d.items.filter((it) => it.destination.id !== dest.id),
      }));
      const updatedPlan = {
        ...itinerary,
        days: updatedDays,
        totalDestinations: Math.max(0, itinerary.totalDestinations - 1),
      };
      setItinerary(updatedPlan);
      const remainingDests = updatedDays.flatMap((d) => d.items.map((it) => it.destination));
      fetchCostEstimation(remainingDests);
      showToast(`Removed ${dest.name} from plan.`);
      return;
    }

    // Find day with fewest items to balance the multi-day itinerary
    let bestDayIndex = 0;
    let minItems = itinerary.days[0]?.items.length ?? 0;
    for (let i = 1; i < itinerary.days.length; i++) {
      if (itinerary.days[i].items.length < minItems) {
        minItems = itinerary.days[i].items.length;
        bestDayIndex = i;
      }
    }

    const targetDay = itinerary.days[bestDayIndex] || itinerary.days[0];
    const targetDayNumber = targetDay?.dayNumber || (bestDayIndex + 1);

    const slotTimes = ['09:00 - 11:00', '11:30 - 13:30', '14:30 - 16:30', '17:00 - 19:00', '19:30 - 21:00'];
    const chosenSlot = slotTimes[Math.min(targetDay.items.length, slotTimes.length - 1)];

    const newItem = {
      id: `item-${Date.now()}-${dest.id}`,
      destination: dest,
      order: targetDay.items.length + 1,
      dayNumber: targetDayNumber,
      timeSlot: chosenSlot,
      durationMin: dest.estimatedDurationMin,
      travelTimeFromPreviousMin: targetDay.items.length > 0 ? 20 : 0,
      travelDistanceFromPreviousKm: targetDay.items.length > 0 ? 6.5 : 0,
      trafficLevel: 'Moderate' as const,
      userNotes: dest.bestTimeToVisit,
    };

    const updatedDays = itinerary.days.map((d, i) =>
      i === bestDayIndex
        ? {
            ...d,
            items: [...d.items, newItem],
            totalDurationMin: d.totalDurationMin + dest.estimatedDurationMin + (d.items.length > 0 ? 20 : 0),
            totalDistanceKm: Math.round((d.totalDistanceKm + (d.items.length > 0 ? 6.5 : 0)) * 10) / 10,
          }
        : d
    );

    const updatedPlan: ItineraryPlan = {
      ...itinerary,
      days: updatedDays,
      totalDestinations: itinerary.totalDestinations + 1,
      totalEstimatedBudgetINR: itinerary.totalEstimatedBudgetINR + dest.feeINR,
    };

    setDestinations((prev) => (prev.some((p) => p.id === dest.id) ? prev : [dest, ...prev]));
    setItinerary(updatedPlan);
    const allPlanDests = updatedDays.flatMap((d) => d.items.map((it) => it.destination));
    fetchCostEstimation(allPlanDests);
    showToast(`Added ${dest.name} to Day ${targetDayNumber} of your plan! AI cost estimation updated.`);
  };

  // Compute Personalized Recommendations
  const handleComputeRecommendations = async () => {
    setIsComputingRecommendations(true);
    try {
      const resp = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: preferences.startingLocation,
          interests: preferences.interests,
          budget: preferences.budget,
          tripDurationDays: preferences.tripDurationDays,
          weights: preferences.scoringWeights,
          weatherConditions: {
            temperatureC: weather?.current?.temperatureC || 32,
            isRaining: (weather?.current?.precipitationProbability || 0) > 40,
          },
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setRecommendations(data.rankedDestinations);
        setActiveTab('recommendations');
        showToast('Personalized recommendations computed with transparent weights!');
        fetchRecommendationBriefing(data.rankedDestinations.slice(0, 4));
      }
    } catch (err) {
      console.error('Recommendation computation error:', err);
    } finally {
      setIsComputingRecommendations(false);
    }
  };

  const fetchRecommendationBriefing = async (topScored: ScoredDestination[]) => {
    try {
      const resp = await fetch('/api/recommendations/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: topScored.map((s) => s.destination),
          preferences,
          weather: weather?.current || {},
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setRecommendationBriefing(data.explanation);
      }
    } catch (err) {
      console.warn('Briefing error:', err);
    }
  };

  // Save Trip to In-Memory / Local Storage
  const handleSaveItinerary = async () => {
    if (!itinerary) return;
    setIsSavingTrip(true);
    try {
      const resp = await fetch('/api/saved-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itinerary),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        showToast(t('savedSuccessfully', 'Trip saved successfully!'));
        fetchSavedTrips();
      }
    } catch (err) {
      console.error('Save trip error:', err);
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleDeleteSavedTrip = async (tripId: string) => {
    try {
      const resp = await fetch(`/api/saved-trips/${tripId}`, { method: 'DELETE' });
      if (resp.ok) {
        showToast('Trip removed from saved archive.');
        fetchSavedTrips();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const categories: DestinationCategory[] = [
    'All',
    'Heritage & Temples',
    'Caves & Architecture',
    'Nature & Islands',
    'Culture & Museums',
    'Food & Cuisine',
  ];

  const itemsInPlanCount = itinerary ? itinerary.days.reduce((acc, d) => acc + d.items.length, 0) : 0;
  const plannedDestinations = itinerary ? itinerary.days.flatMap((d) => d.items.map((it) => it.destination)) : [];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F7F5EF] flex flex-col text-[#343A36] selection:bg-[#91A995]/20 selection:text-[#243C32]">
      {/* Fixed Top Horizontal Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'saved') {
            setIsSavedTripsModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        savedTripsCount={savedTrips.length}
        onOpenSavedTrips={() => setIsSavedTripsModalOpen(true)}
        onOpenPacking={() => setIsPackingModalOpen(true)}
        onOpenDiagnostics={() => setIsEvaluationOpen(true)}
        onExportPdf={() => setIsExportModalOpen(true)}
      />

      {/* Animated Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-6 z-50 bg-[#243C32] text-white px-4 py-2.5 rounded-full shadow-xl border border-white/10 text-xs font-medium flex items-center gap-2.5"
          >
            <CheckCircle className="w-4 h-4 text-[#91A995] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step-by-Step Location & Destination Selection Workflow Header */}
        <TripWorkflowHeader
          startingLocation={preferences.startingLocation}
          onSelectStartingLocation={handleSelectStartingLocation}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelectDestinationRegion}
          itemsInPlanCount={itemsInPlanCount}
          totalEstimatedCost={costEstimation?.totalEstimatedCost || 0}
          onOpenItinerary={() => setActiveTab('itinerary')}
          onFocusStartingPointOnMap={handleFocusStartingPointOnMap}
          tripDurationDays={preferences.tripDurationDays}
          onUpdateDurationDays={handleUpdateTripDuration}
          customBudgetAmount={preferences.customBudgetAmount}
          onUpdateBudgetAmount={handleUpdateCustomBudget}
          onClearItinerary={handleClearItinerary}
          onAutoFillPlan={handleAutoFillItinerary}
          travelersCount={travelersCount}
          onUpdateTravelersCount={(count) => {
            setTravelersCount(count);
            fetchCostEstimation(undefined, undefined, { travelersCount: count });
          }}
          selectedDestinations={plannedDestinations}
          onRemoveDestination={(dest) => handleAddToItinerary(dest)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >

        {/* TAB 1: EXPLORE POPULAR PLACES & ESTIMATE COSTS */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            {!selectedRegion ? (
              <DestinationShowcase
                onSelectRegion={handleSelectDestinationRegion}
                onSearchCustomCity={handleGeminiSearch}
                isSearching={isAiSearching}
              />
            ) : (
              <>
                {/* Active Destination Top Bar */}
                <div className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#243C32] flex items-center justify-center font-bold text-sm shrink-0">
                      <MapPin className="w-5 h-5 text-[#243C32]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-[#243C32] uppercase tracking-wider bg-[#91A995]/15 px-2.5 py-0.5 rounded-full">
                          Active Circuit
                        </span>
                        <span className="text-xs text-[#858B84]">
                          {destinations.length} popular spots loaded
                        </span>
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#343A36] flex items-center gap-2 mt-0.5">
                        <span>{selectedRegion.name}</span>
                        <span className="text-xs font-normal text-[#858B84]">
                          · {selectedRegion.state}
                          {selectedRegion.country ? `, ${selectedRegion.country}` : ''}
                        </span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegion(null);
                        setDestinations([]);
                        setSelectedDestination(null);
                        setActiveRoute(null);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-[#343A36] bg-[#FFFFFF] hover:bg-[#F7F5EF] rounded-full border border-[#D8D2C5] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#243C32]" />
                      <span>All Destinations</span>
                    </button>
                    {itemsInPlanCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('itinerary')}
                        className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-[#FFFFFF] bg-[#243C32] hover:bg-[#1B2E26] rounded-full transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>View Trip Plan ({itemsInPlanCount})</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live AI Cost Estimation Card (Displays whenever places are in the plan) */}
                {itemsInPlanCount > 0 && (
                  <AICostEstimationCard
                    estimation={costEstimation}
                    isLoading={isCostEstimating}
                    onRefresh={() => fetchCostEstimation()}
                    onUpdateParams={(params) => {
                      if (params.travelersCount) setTravelersCount(params.travelersCount);
                      if (params.travelStyle) setTravelStyle(params.travelStyle);
                      if (params.tripDurationDays) {
                        setPreferences((prev) => ({ ...prev, tripDurationDays: params.tripDurationDays! }));
                      }
                      fetchCostEstimation(undefined, undefined, params);
                    }}
                    customBudgetAmount={preferences.customBudgetAmount}
                  />
                )}

                {/* Split Screen Layout: Map & Controls (Left 55%) + Destination Cards & Weather (Right 45%) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Interactive Map & Live Traffic Card (Sticky on Desktop) */}
                  <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-20" id="interactive-map-section">
                    <div className="h-[500px] rounded-3xl overflow-hidden shadow-xs border border-slate-200/80">
                      <InteractiveMap
                        destinations={destinations}
                        selectedDestination={selectedDestination}
                        onSelectDestination={(d) => {
                          setSelectedDestination(d);
                          handleCalculateRoute(d);
                        }}
                        activeRoute={activeRoute}
                    originLocation={preferences.startingLocation}
                    onAddToItinerary={handleAddToItinerary}
                    onSetUserLocation={(loc) => handleSelectStartingLocation(loc)}
                  />
                </div>

                {/* Vehicle Route Selector, Cost Reference & Direct Platform Navigation */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Select Vehicle / Route Mode
                    </span>
                    {isRouteLoading && (
                      <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Updating route...
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'driving', label: '🚗 Car / Cab' },
                      { id: 'two_wheeler', label: '🛵 Bike / Rapido' },
                      { id: 'transit', label: '🚌 Public Transit' },
                      { id: 'train', label: '🚆 Train' },
                      { id: 'flight', label: '✈️ Flight' },
                      { id: 'walking', label: '🚶 Walk' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedRouteMode(m.id);
                          const target = selectedDestination || destinations[0];
                          if (target) {
                            handleCalculateRoute(target, undefined, m.id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          selectedRouteMode === m.id
                            ? 'bg-slate-950 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {activeRoute && (
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-3.5 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">
                            {activeRoute.distanceKm} km · ~{activeRoute.trafficAdjustedDurationMin} mins
                          </span>
                          {activeRoute.trafficDelayMin > 0 && (
                            <span className="ml-2 text-amber-700 font-semibold">
                              (+{activeRoute.trafficDelayMin}m traffic)
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                          {activeRoute.estimatedCostLabel || `Est. ₹${activeRoute.estimatedCostINR || 0}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Source: {activeRoute.routingSource} · {activeRoute.trafficSource}
                      </div>
                      {activeRoute.platformLinks && activeRoute.platformLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activeRoute.platformLinks.map((pl) => (
                            <a
                              key={pl.label}
                              href={pl.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold hover:border-indigo-400 hover:text-indigo-700 transition-all text-[11px] shadow-2xs hover:shadow-xs"
                            >
                              <span>{pl.label}</span>
                              <ArrowRight className="w-3 h-3 text-indigo-500" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Machine Learning Traffic Prediction Module */}
                <TrafficPredictionCard
                  prediction={trafficPrediction}
                  isLoading={isTrafficLoading}
                  onDepartureTimeChange={(time) => {
                    setPreferences((prev) => ({ ...prev, departureTime: time }));
                    if (selectedDestination) {
                      fetchTrafficPrediction(selectedDestination.id, time);
                    }
                  }}
                />
              </div>

              {/* Right Column: Search, Category Filters & Destination Cards */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search Bar & Category Filters with Gemini AI Discovery */}
                <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E6E2D8] space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#858B84] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value, selectedCategory);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleGeminiSearch();
                          }
                        }}
                        placeholder="Search any destination worldwide (Goa, Paris, Tokyo, Jaipur)..."
                        className="w-full bg-[#F7F5EF] border border-[#E6E2D8] rounded-xl pl-10 pr-3 py-2 text-xs text-[#343A36] focus:outline-none focus:border-[#243C32] placeholder:text-[#858B84]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGeminiSearch()}
                      disabled={isAiSearching}
                      className="px-4 py-2 bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Discover authentic spots with Google Gemini AI"
                    >
                      {isAiSearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#D68B65]" />
                          <span>AI Discover</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1-Tap Quick Explore City Hubs */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-indigo-500" />
                      <span>Featured Circuits (1-Click AI Search):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Goa Beaches', query: 'Goa beaches and forts' },
                        { label: 'Hyderabad', query: 'Hyderabad pearls and monuments' },
                        { label: 'Jaipur Palaces', query: 'Jaipur royal palaces' },
                        { label: 'Delhi Heritage', query: 'Delhi historical landmarks' },
                        { label: 'Kerala Scenic', query: 'Kerala scenic waterways' },
                        { label: 'Mumbai Marine', query: 'Mumbai iconic coastal places' },
                        { label: 'Paris Wonders', query: 'Paris famous attractions' },
                        { label: 'Tokyo Highlights', query: 'Tokyo cultural landmarks' },
                        { label: 'Vijayawada', query: 'Vijayawada' },
                      ].map((hub) => (
                        <button
                          key={hub.label}
                          type="button"
                          onClick={() => {
                            setSearchQuery(hub.query);
                            handleGeminiSearch(hub.query);
                          }}
                          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                            searchQuery.toLowerCase().includes(hub.label.toLowerCase().split(' ')[0])
                              ? 'bg-slate-950 text-white border-slate-950 font-semibold shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/70 hover:text-slate-950'
                          }`}
                        >
                          {hub.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100/90">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          handleSearch(searchQuery, cat);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-slate-950 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gemini AI Searching Indicator */}
                {isAiSearching && (
                  <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex items-center gap-3 text-xs text-indigo-950 animate-pulse shadow-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-spin" />
                    <div>
                      <div className="font-bold">Consulting Google Gemini AI for authentic attractions...</div>
                      <div className="text-[11px] text-indigo-600">Retrieving verified coordinates, admission fees, and high-res photos.</div>
                    </div>
                  </div>
                )}

                {/* Active AI Discovery Banner */}
                {discoveredCityLabel && !isAiSearching && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-950 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Popular places discovered for <strong className="font-bold text-slate-900">{discoveredCityLabel}</strong> ({destinations.length} spots)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetExplore}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}

                {/* Weather Widget */}
                <WeatherWidget
                  weather={weather}
                  isLoading={isWeatherLoading}
                  onRefresh={() =>
                    selectedRegion &&
                    fetchWeather(
                      selectedRegion.latitude,
                      selectedRegion.longitude,
                      selectedRegion.name
                    )
                  }
                />

                {/* Popular Places Catalog with Exact Images & Costs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono px-1">
                    <span className="font-semibold text-slate-700">
                      {discoveredCityLabel
                        ? `Popular Places for "${discoveredCityLabel}"`
                        : `Popular Places in ${selectedRegion.name}`} ({destinations.length})
                    </span>
                    <span>Click 'Add' to estimate budget</span>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {destinations.map((dest) => {
                      const isInItinerary = itinerary?.days.some((d) =>
                        d.items.some((it) => it.destination.id === dest.id)
                      );
                      return (
                        <DestinationCard
                          key={dest.id}
                          destination={dest}
                          isSelected={selectedDestination?.id === dest.id}
                          onSelect={() => setSelectedDestination(dest)}
                          onCalculateRoute={() => handleCalculateRoute(dest)}
                          onAddToItinerary={() => handleAddToItinerary(dest)}
                          isInItinerary={isInItinerary}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Places API (New) Dynamic Popular Places Discovery */}
            <div className="mt-8">
              <PopularPlaces
                destinationCity={discoveredCityLabel || selectedRegion?.name || 'Vijayawada'}
                destinationCoords={
                  selectedDestination
                    ? { latitude: selectedDestination.latitude, longitude: selectedDestination.longitude }
                    : selectedRegion
                    ? { latitude: selectedRegion.latitude, longitude: selectedRegion.longitude }
                    : undefined
                }
                itineraryDestinations={itinerary?.days.flatMap((d) => d.items.map((it) => it.destination)) || []}
                onAddToItinerary={handleAddToItinerary}
                onRemoveFromItinerary={(id) => {
                  const match = (itinerary?.days.flatMap((d) => d.items.map((it) => it.destination)) || []).find((d) => d.id === id);
                  if (match) handleAddToItinerary(match);
                }}
                onSelectPlaceForMap={(place) => {
                  setSelectedDestination(place);
                  handleCalculateRoute(place);
                  document.getElementById('interactive-map-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </>
        )}
      </div>
    )}

        {/* TAB 2: PERSONALIZED RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Preferences Form */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
                <PreferenceForm
                  preferences={preferences}
                  onUpdatePreferences={(newPrefs) => setPreferences(newPrefs)}
                  onSubmit={handleComputeRecommendations}
                  isLoading={isComputingRecommendations}
                />

                <WeatherWidget
                  weather={weather}
                  isLoading={isWeatherLoading}
                  onRefresh={() =>
                    fetchWeather(
                      preferences.startingLocation.latitude,
                      preferences.startingLocation.longitude,
                      preferences.startingLocation.name
                    )
                  }
                />
              </div>

              {/* Right Column: Recommendations Results */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                {recommendations.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-[#E8EAF2] p-12 text-center shadow-[0_10px_35px_-10px_rgba(16,24,40,0.05)]">
                    <div className="w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#5145E5]/25">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="font-display text-lg font-black text-[#101828]">
                      AI Personalized Recommendation Engine
                    </h3>
                    <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
                      Configure your travel interests, budget, and trip duration on the left, then click &ldquo;Calculate Personalized Recommendations&rdquo; to run our transparent weighted scoring algorithm.
                    </p>
                    <button
                      onClick={handleComputeRecommendations}
                      disabled={isComputingRecommendations}
                      className="px-6 py-3 bg-brand-gradient text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#5145E5]/25 cursor-pointer"
                    >
                      Run AI Recommendation Pass
                    </button>
                  </div>
                ) : (
                  <>
                    {/* AI Executive Briefing */}
                    {recommendationBriefing && (
                      <div className="p-5 bg-hero-midnight text-white rounded-3xl space-y-2 text-xs shadow-lg">
                        <div className="flex items-center gap-2 font-bold text-[#14B8A6] uppercase tracking-wider text-[11px]">
                          <Sparkles className="w-4 h-4 text-[#14B8A6]" />
                          <span>AI Executive Travel Briefing (Gemini 3.8 Flash)</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-line text-slate-200">{recommendationBriefing}</p>
                      </div>
                    )}

                    {/* Ranked Destination Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recommendations.map((scored) => {
                        const isInItinerary = itinerary?.days.some((d) =>
                          d.items.some((it) => it.destination.id === scored.destination.id)
                        );
                        return (
                          <DestinationCard
                            key={scored.destination.id}
                            destination={scored.destination}
                            scoredData={scored}
                            isSelected={selectedDestination?.id === scored.destination.id}
                            onSelect={() => setSelectedDestination(scored.destination)}
                            onCalculateRoute={() => handleCalculateRoute(scored.destination)}
                            onAddToItinerary={() => handleAddToItinerary(scored.destination)}
                            isInItinerary={isInItinerary}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ITINERARY PLANNER & AI BUDGET */}
        {activeTab === 'itinerary' && (
          <div className="space-y-6">
            {/* AI Cost Estimation Card with Full Breakdown */}
            <AICostEstimationCard
              estimation={costEstimation}
              isLoading={isCostEstimating}
              onRefresh={() => fetchCostEstimation()}
              onUpdateParams={(params) => {
                if (params.travelersCount) setTravelersCount(params.travelersCount);
                if (params.travelStyle) setTravelStyle(params.travelStyle);
                if (params.tripDurationDays) {
                  setPreferences((prev) => ({ ...prev, tripDurationDays: params.tripDurationDays! }));
                }
                fetchCostEstimation(undefined, undefined, params);
              }}
              customBudgetAmount={preferences.customBudgetAmount}
              onOpenExportSheet={() => setIsExportModalOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Itinerary Timeline */}
              <div className="lg:col-span-7">
                <ItineraryBuilder
                  itinerary={itinerary}
                  onUpdateItinerary={(updated) => {
                    setItinerary(updated);
                    const dests = updated.days.flatMap((d) => d.items.map((it) => it.destination));
                    fetchCostEstimation(dests);
                  }}
                  onSaveItinerary={handleSaveItinerary}
                  onFocusDestination={(dest) => {
                    setSelectedDestination(dest);
                    handleCalculateRoute(dest);
                  }}
                  isSaving={isSavingTrip}
                  customBudgetAmount={preferences.customBudgetAmount}
                  onOpenExportSheet={() => setIsExportModalOpen(true)}
                  onOpenPackingList={() => setIsPackingModalOpen(true)}
                  onClearItinerary={handleClearItinerary}
                  onAutoFillPlan={handleAutoFillItinerary}
                  onNavigateToExplore={() => setActiveTab('explore')}
                  candidateDestinations={destinations}
                  weatherData={weather}
                />
              </div>

              {/* Right Column: Route Map & Live Traffic */}
              <div className="lg:col-span-5 space-y-4">
                <div className="h-[380px]">
                  <InteractiveMap
                    destinations={destinations}
                    selectedDestination={selectedDestination}
                    onSelectDestination={(d) => {
                      setSelectedDestination(d);
                      handleCalculateRoute(d);
                    }}
                    activeRoute={activeRoute}
                    originLocation={preferences.startingLocation}
                  />
                </div>

                <TrafficPredictionCard
                  prediction={trafficPrediction}
                  isLoading={isTrafficLoading}
                  onDepartureTimeChange={(time) => {
                    setPreferences((prev) => ({ ...prev, departureTime: time }));
                    if (selectedDestination) {
                      fetchTrafficPrediction(selectedDestination.id, time);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: NEARBY DISCOVERY, HOTELS & RESTAURANTS */}
        {activeTab === 'nearby' && (
          <Suspense fallback={<div className="p-10 text-center text-xs text-slate-500">Loading Nearby Discovery...</div>}>
            <NearbyDiscoveryPanel
              centerLocation={
                selectedRegion
                  ? { name: selectedRegion.name, latitude: selectedRegion.latitude, longitude: selectedRegion.longitude }
                  : preferences.startingLocation
              }
              itineraryDestinationIds={itinerary?.days.flatMap((d) => d.items.map((i) => i.destination.id)) || []}
              onAddToItinerary={(dest) => {
                handleAddToItinerary(dest);
                showToast(`Added "${dest.name}" to your itinerary.`);
              }}
              onFocusOnMap={(dest) => {
                setSelectedDestination(dest);
                setActiveTab('explore');
                handleCalculateRoute(dest);
              }}
            />
          </Suspense>
        )}

        {/* TAB: BUDGET MANAGER, AI COST OPTIMIZER & GROUP EXPENSE SPLITTING */}
        {activeTab === 'budget' && (
          <Suspense fallback={<div className="p-10 text-center text-xs text-[#858B84]">Loading Budget &amp; Group Manager...</div>}>
            <BudgetGroupPanel
              itinerary={itinerary}
              travelersCount={travelersCount}
              customBudgetAmount={preferences.customBudgetAmount}
              onNotify={(msg) => showToast(msg)}
              onJoinSharedTrip={(joinedTrip) => {
                setItinerary(joinedTrip);
                setActiveTab('itinerary');
                const dests = joinedTrip.days.flatMap((d: any) => d.items.map((it: any) => it.destination));
                fetchCostEstimation(dests);
                showToast(`Synced with group trip "${joinedTrip.title}"!`);
              }}
            />
          </Suspense>
        )}

        {/* TAB: ACCOUNT VAULT, DOCUMENTS, OFFLINE TRIPS & SMART TOOLS */}
        {activeTab === 'vault' && (
          <Suspense fallback={<div className="p-10 text-center text-xs text-slate-500">Loading Travel Vault...</div>}>
            <TravelVaultPanel
              itinerary={itinerary}
              destinationCountryHint={selectedRegion?.country || 'India'}
              onLoadOfflineTrip={(trip) => {
                setItinerary(trip);
                setActiveTab('itinerary');
                showToast(`Loaded offline trip "${trip.title}".`);
              }}
              onNotify={(msg) => showToast(msg)}
            />
          </Suspense>
        )}

        {/* TAB 4: AI TRAVEL ADVISOR CHAT */}
        {activeTab === 'assistant' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8">
                <AIAssistantChat
                  onSelectDestinationByName={(dName) => {
                    const match = destinations.find((d) => d.name.toLowerCase().includes(dName.toLowerCase()));
                    if (match) {
                      setSelectedDestination(match);
                      setActiveTab('explore');
                      handleCalculateRoute(match);
                    }
                  }}
                  tripContextSummary={`Origin: ${preferences.startingLocation.name}. Destination: ${discoveredCityLabel || selectedRegion?.name || 'Worldwide'}. Duration: ${preferences.tripDurationDays} day(s). Travelers: ${travelersCount}. Budget: ${preferences.customBudgetAmount ? `₹${preferences.customBudgetAmount}` : preferences.budget}. Stops in itinerary: ${itinerary?.days.flatMap((d) => d.items.map((i) => `${i.destination.name} (${i.timeSlot})`)).join(', ') || 'None yet'}. Weather: ${weather ? `${weather.current.temperatureC}°C, ${weather.current.weatherDescription}, rain prob ${weather.current.precipitationProbability}%` : 'Not loaded'}.`}
                />
              </div>

              {/* Side context info */}
              <div className="lg:col-span-4 space-y-4">
                <WeatherWidget
                  weather={weather}
                  isLoading={isWeatherLoading}
                  onRefresh={() =>
                    selectedRegion
                      ? fetchWeather(
                          selectedRegion.latitude,
                          selectedRegion.longitude,
                          selectedRegion.name
                        )
                      : fetchWeather(
                          preferences.startingLocation.latitude,
                          preferences.startingLocation.longitude,
                          preferences.startingLocation.name
                        )
                  }
                />

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Travel Advisor Grounding
                  </h4>
                  <p className="leading-relaxed">
                    Powered by server-side Gemini 3.8 Flash. Grounded with accurate entry tickets, local opening hours, and Open-Meteo forecasts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E8EAF2] mt-14 py-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-display font-black text-[#101828] tracking-tight">AI-TRAVELMATE</span>
            <span>· Intelligent Travel Discovery &amp; Planning Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748B] font-medium">
            <span>Google Places &amp; OpenStreetMap</span>
            <span>·</span>
            <span>Open-Meteo Weather</span>
            <span>·</span>
            <span>OSRM Multi-Modal Routing</span>
            <span>·</span>
            <span>Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>

      {/* SRS Lab & Evaluation Modal */}
      <EvaluationModal
        isOpen={isEvaluationOpen}
        onClose={() => setIsEvaluationOpen(false)}
      />

      {/* Saved Trips Modal */}
      <SavedTripsModal
        isOpen={isSavedTripsModalOpen}
        onClose={() => setIsSavedTripsModalOpen(false)}
        savedTrips={savedTrips}
        onLoadTrip={(trip) => {
          setItinerary(trip);
          setActiveTab('itinerary');
          const dests = trip.days.flatMap((d: any) => d.items.map((it: any) => it.destination));
          fetchCostEstimation(dests);
          showToast(`Loaded ${trip.title}`);
        }}
        onDeleteTrip={handleDeleteSavedTrip}
      />

      {/* Offline Printable Travel Sheet Modal (PDF / HTML Export) */}
      <TripExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        itinerary={itinerary}
        costEstimation={costEstimation}
        weather={weather}
        customBudgetAmount={preferences.customBudgetAmount}
        currencySymbol={currencySymbol}
        onOpenPackingList={() => {
          setIsExportModalOpen(false);
          setIsPackingModalOpen(true);
        }}
      />

      {/* Smart Packing List Generator Modal */}
      <PackingListModal
        isOpen={isPackingModalOpen}
        onClose={() => setIsPackingModalOpen(false)}
        tripDurationDays={preferences.tripDurationDays}
        weather={weather}
        destinations={itinerary ? itinerary.days.flatMap((d) => d.items.map((it) => it.destination)) : destinations}
        tripTitle={itinerary?.title}
        onOpenExportSheet={() => {
          setIsPackingModalOpen(false);
          setIsExportModalOpen(true);
        }}
      />

      {/* Vertical Right-Bottom Quick-Action Dock */}
      <FloatingQuickDock
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenPackingList={() => setIsPackingModalOpen(true)}
        onOpenExportSheet={() => setIsExportModalOpen(true)}
        onOpenDiagnostics={() => setIsEvaluationOpen(true)}
      />
    </div>
  );
}
