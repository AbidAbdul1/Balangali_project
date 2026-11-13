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
    <header className="sticky top-0 left-0 right-0 z-30 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Brand Wordmark - Luxury Travel Studio Style */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('explore')}
              className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-md ring-1 ring-white/10 group-hover:scale-105 group-hover:shadow-indigo-500/20 transition-all duration-300">
                <Compass className="w-5 h-5 text-indigo-300 group-hover:rotate-45 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-black tracking-tight text-slate-950 whitespace-nowrap">
                  {t('appTitle', 'TRAVELMATE')}
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-normal -mt-0.5 hidden sm:inline">
                  Intelligent Travel &amp; Route Suite
                </span>
              </div>
            </button>
          </div>

          {/* Primary Navigation Links - Modern Luxury Pills */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 p-1 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === 'explore'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              {t('explore', 'Explore Places')}
            </button>

            <button
              onClick={() => setActiveTab('nearby')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'nearby'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nearby &amp; Stays</span>
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === 'recommendations'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              {t('recommendations', 'AI Recommender')}
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'itinerary'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('itinerary', 'Itinerary & Budget')}</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'assistant'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('assistant', 'AI Advisor')}</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'vault'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              <span>Vault &amp; Offline</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === 'saved'
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
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
      <div className="flex md:hidden overflow-x-auto px-4 py-2 bg-slate-100/90 border-t border-slate-200/80 gap-1.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'explore' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          {t('explore', 'Explore')}
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'nearby' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          Nearby &amp; Stays
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'recommendations' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          {t('recommendations', 'AI Recommender')}
        </button>
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'itinerary' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          {t('itinerary', 'Itinerary')}
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'assistant' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          {t('assistant', 'AI Advisor')}
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'vault' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          Vault &amp; Offline
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${activeTab === 'saved' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
            }`}
        >
          {t('savedTrips', 'Saved')} ({savedTripsCount})
        </button>
      </div>
    </header>
  );
};
