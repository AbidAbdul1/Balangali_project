import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  Bookmark,
  Calendar,
  Shield,
  MapPin,
  Bot,
  Menu,
  X,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type NavTab =
  | 'explore'
  | 'nearby'
  | 'recommendations'
  | 'itinerary'
  | 'budget'
  | 'assistant'
  | 'vault'
  | 'saved';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{
    id: NavTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'explore',
      label: t('explore', 'Explore'),
      shortLabel: 'Explore',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'nearby',
      label: 'Nearby & Stays',
      shortLabel: 'Nearby',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'recommendations',
      label: t('recommendations', 'AI Recommender'),
      shortLabel: 'Recommender',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'itinerary',
      label: t('itinerary', 'Trip Planner'),
      shortLabel: 'Trip Planner',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'assistant',
      label: t('assistant', 'AI Travel Advisor'),
      shortLabel: 'AI Advisor',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'vault',
      label: 'Vault & Offline',
      shortLabel: 'Vault',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'saved',
      label: t('savedTrips', 'Saved Trips'),
      shortLabel: 'Saved',
      icon: <Bookmark className="w-4 h-4" />,
      badge: savedTripsCount > 0 ? savedTripsCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-40 w-full bg-white/92 backdrop-blur-xl border-b border-[#E8EAF2] shadow-[0_4px_24px_-6px_rgba(16,24,40,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-18 py-3">
          {/* AI-TRAVELMATE Brand Identity */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('explore');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-lg shadow-[#5145E5]/25 ring-1 ring-white/20 group-hover:scale-105 transition-all duration-300">
              <Compass className="w-5 h-5 text-white group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg sm:text-xl font-black tracking-tight text-[#101828] whitespace-nowrap">
                  AI-TRAVELMATE
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#5145E5]/10 text-[#5145E5]">
                  Pro
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-medium tracking-normal -mt-0.5 hidden sm:inline">
                Intelligent Discovery &amp; Journey Platform
              </span>
            </div>
          </button>

          {/* Desktop Navigation Bar */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1 p-1.5 bg-[#F7F8FC] rounded-2xl border border-[#E8EAF2]"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-brand-gradient text-white shadow-md shadow-[#5145E5]/25'
                      : 'text-[#64748B] hover:text-[#101828] hover:bg-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[#5145E5]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#5145E5]/10 text-[#5145E5]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Quick Budget Action + Mobile Drawer Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('budget')}
              className={`hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-[#101828] text-white border-[#101828] shadow-sm'
                  : 'bg-white text-[#101828] border-[#E8EAF2] hover:border-[#5145E5]/40 hover:bg-[#F7F8FC]'
              }`}
              title="Open Budget & Group Expense Split"
            >
              <Wallet className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span className="hidden xl:inline">Budget &amp; Split</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-[#F7F8FC] border border-[#E8EAF2] text-[#101828] hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tablet / Mobile Horizontal Pill Strip */}
      <div className="flex lg:hidden overflow-x-auto px-4 py-2 bg-[#F7F8FC] border-t border-[#E8EAF2] gap-1.5 scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                isActive
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'bg-white text-[#64748B] border border-[#E8EAF2] hover:text-[#101828]'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-[#5145E5]'}>{item.icon}</span>
              <span>{item.shortLabel}</span>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-[#5145E5]/10 text-[#5145E5]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable Mobile Full Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#E8EAF2] px-4 py-4 shadow-xl space-y-1.5 animate-fade-slide-up">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-gradient text-white shadow-sm'
                    : 'text-[#101828] hover:bg-[#F7F8FC]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-[#5145E5]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#5145E5]/10 text-[#5145E5]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setActiveTab('budget');
              setMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'budget'
                ? 'bg-[#101828] text-white'
                : 'text-[#101828] hover:bg-[#F7F8FC]'
            }`}
          >
            <Wallet className="w-4 h-4 text-[#14B8A6]" />
            <span>Budget &amp; Group Expense Split</span>
          </button>
        </div>
      )}
    </header>
  );
};
