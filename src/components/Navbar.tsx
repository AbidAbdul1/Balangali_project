import React from 'react';
import { Compass, Sparkles, Bookmark, Calendar, Shield, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 'explore' | 'nearby' | 'recommendations' | 'itinerary' | 'budget' | 'assistant' | 'vault' | 'saved';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenEvaluation?: () => void;
  savedTripsCount: number;
  onOpenExportSheet?: () => void;
  onOpenPackingList?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedTripsCount,
}) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 left-0 right-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Brand Wordmark - Luxury Travel Studio Style */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('explore')}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                  {t('appTitle', 'TRAVELMATE')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium tracking-normal -mt-0.5 hidden sm:inline">
                  Intelligent Travel & Route Suite
                </span>
              </div>
            </button>
          </div>

          {/* Primary Navigation Links - Fixed Horizontal Bar (Quick Tools moved to Right-Bottom Dock) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${activeTab === 'explore'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              {t('explore', 'Explore Places')}
            </button>

            <button
              onClick={() => setActiveTab('nearby')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'nearby'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Nearby & Stays</span>
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${activeTab === 'recommendations'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              {t('recommendations', 'AI Recommender')}
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'itinerary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('itinerary', 'Itinerary & Budget')}</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'assistant'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('assistant', 'AI Advisor')}</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'vault'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Vault & Offline</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'saved'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('savedTrips', 'Saved Trips')}</span>
              {savedTripsCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md">
                  {savedTripsCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Subnavigation */}
      <div className="flex md:hidden overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'explore' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          {t('explore', 'Explore')}
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'nearby' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          Nearby & Stays
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'recommendations' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          {t('recommendations', 'Recommendations')}
        </button>
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'itinerary' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          {t('itinerary', 'Itinerary & Budget')}
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'assistant' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          {t('assistant', 'AI Chat')}
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'vault' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          Vault & Offline
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${activeTab === 'saved' ? 'bg-white shadow-xs text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
        >
          {t('savedTrips', 'Saved')} ({savedTripsCount})
        </button>
      </div>
    </header>
  );
};
