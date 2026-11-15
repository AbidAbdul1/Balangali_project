import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Menu,
  X,
  Bookmark,
  Users,
  MoreHorizontal,
  ShieldCheck,
  Briefcase,
  FileDown,
  Globe,
  Coins,
  Activity,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';
import { useLanguage, CurrencyCode } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/translations';
import { AuthUser } from '../types/travel';

export type NavTabId =
  | 'explore'
  | 'nearby'
  | 'recommendations'
  | 'itinerary'
  | 'assistant'
  | 'budget'
  | 'vault'
  | 'saved';

export type NavTab = NavTabId;

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  savedTripsCount?: number;
  onOpenSavedTrips?: () => void;
  onOpenPacking?: () => void;
  onOpenDiagnostics?: () => void;
  onExportPdf?: () => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  onLogout?: () => void;
}

const CENTER_LINKS: Array<{ id: NavTabId; label: string }> = [
  { id: 'explore', label: 'Explore' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'recommendations', label: 'AI Planner' },
  { id: 'itinerary', label: 'My Trips' },
  { id: 'assistant', label: 'Travel Advisor' },
];

const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'INR', label: 'INR (₹)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedTripsCount = 0,
  onOpenSavedTrips,
  onOpenPacking,
  onOpenDiagnostics,
  onExportPdf,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = (tab: NavTabId) => {
    setActiveTab(tab);
    setMoreOpen(false);
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F5EF]/95 backdrop-blur-md border-b border-[#E6E2D8] no-print">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <button
          type="button"
          onClick={() => navigate('explore')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <span className="w-8 h-8 rounded-full bg-[#243C32] text-[#FFFFFF] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Compass className="w-4 h-4" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-[#343A36]">
            AI-TravelMate
          </span>
        </button>

        {/* Center Editorial Links */}
        <nav aria-label="Primary" className="hidden lg:flex items-center gap-7">
          {CENTER_LINKS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#243C32] font-semibold'
                    : 'text-[#858B84] hover:text-[#343A36]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onOpenSavedTrips ? onOpenSavedTrips() : navigate('itinerary'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-[#343A36] hover:bg-[#FFFFFF] transition-colors"
          >
            <Bookmark className="w-4 h-4 text-[#243C32]" />
            <span>Saved Trips</span>
            {savedTripsCount > 0 && (
              <span className="text-xs font-semibold text-[#D68B65]">({savedTripsCount})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('budget')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'budget'
                ? 'bg-[#243C32] text-[#FFFFFF]'
                : 'border border-[#D8D2C5] text-[#343A36] hover:border-[#243C32] hover:bg-[#FFFFFF]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Group & Split</span>
          </button>

          {/* More Utilities Menu */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'vault'
                  ? 'bg-[#243C32]/10 text-[#243C32]'
                  : 'text-[#858B84] hover:text-[#343A36] hover:bg-[#FFFFFF]'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl shadow-lg py-2 z-50">
                <button
                  type="button"
                  onClick={() => navigate('vault')}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-3"
                >
                  <ShieldCheck className="w-4 h-4 text-[#243C32]" />
                  <div>
                    <div className="font-medium">Travel Vault</div>
                    <div className="text-xs text-[#858B84]">Documents & reminders</div>
                  </div>
                </button>

                {onOpenPacking && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenPacking();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-3"
                  >
                    <Briefcase className="w-4 h-4 text-[#243C32]" />
                    <div>
                      <div className="font-medium">Packing Checklist</div>
                      <div className="text-xs text-[#858B84]">Weather-aware essentials</div>
                    </div>
                  </button>
                )}

                {onExportPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onExportPdf();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-3"
                  >
                    <FileDown className="w-4 h-4 text-[#D68B65]" />
                    <div>
                      <div className="font-medium">Export Trip PDF</div>
                      <div className="text-xs text-[#858B84]">Printable offline itinerary</div>
                    </div>
                  </button>
                )}

                <div className="my-2 border-t border-[#E6E2D8]" />

                <div className="px-4 py-2 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[#858B84]">
                    <Coins className="w-3.5 h-3.5" /> Currency
                  </span>
                  <select
                    aria-label="Select currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="text-xs font-medium text-[#343A36] bg-[#F7F5EF] border border-[#E6E2D8] rounded-lg px-2 py-1 focus:outline-none focus:border-[#243C32]"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-4 py-2 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[#858B84]">
                    <Globe className="w-3.5 h-3.5" /> Language
                  </span>
                  <select
                    aria-label="Select language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    className="text-xs font-medium text-[#343A36] bg-[#F7F5EF] border border-[#E6E2D8] rounded-lg px-2 py-1 focus:outline-none focus:border-[#243C32]"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                {onOpenDiagnostics && (
                  <>
                    <div className="my-2 border-t border-[#E6E2D8]" />
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onOpenDiagnostics();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-[#858B84] hover:text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-2.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>System Diagnostics</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Account / Sign In */}
          {currentUser ? (
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold bg-[#FFFFFF] border border-[#D8D2C5] hover:border-[#243C32] text-[#343A36] transition-all shadow-sm"
              >
                {currentUser.preferences?.avatarUrl ? (
                  <img
                    src={currentUser.preferences.avatarUrl}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#243C32] text-[#FFFFFF] flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[110px] truncate">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#858B84] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#E6E2D8]">
                    <div className="font-semibold text-xs text-[#343A36] truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-[#858B84] truncate">{currentUser.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('vault');
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-2.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#243C32]" />
                    <span>Travel Vault & Documents</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenSavedTrips) onOpenSavedTrips();
                      else navigate('itinerary');
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#343A36] hover:bg-[#F7F5EF] flex items-center gap-2.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#243C32]" />
                    <span>My Saved Trips ({savedTripsCount})</span>
                  </button>

                  <div className="my-1 border-t border-[#E6E2D8]" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#D68B65] hover:bg-[#D68B65]/10 flex items-center gap-2.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('signup')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] shadow-sm hover:shadow transition-all ml-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign Up / Log In</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-full text-[#343A36] hover:bg-[#FFFFFF]"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E6E2D8] bg-[#F7F5EF] px-5 py-4 space-y-1">
          {CENTER_LINKS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-[#243C32] text-[#FFFFFF]' : 'text-[#343A36] hover:bg-[#FFFFFF]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => navigate('budget')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'budget' ? 'bg-[#243C32] text-[#FFFFFF]' : 'text-[#343A36] hover:bg-[#FFFFFF]'
            }`}
          >
            Group & Budget Split
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              if (onOpenSavedTrips) onOpenSavedTrips();
              else navigate('itinerary');
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#343A36] hover:bg-[#FFFFFF]"
          >
            Saved Trips ({savedTripsCount})
          </button>
          <div className="pt-2 border-t border-[#E6E2D8] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('vault')}
              className="px-3 py-2 rounded-xl text-xs font-medium text-[#343A36] bg-[#FFFFFF] border border-[#E6E2D8]"
            >
              Travel Vault
            </button>
            {onOpenPacking && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenPacking();
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-[#343A36] bg-[#FFFFFF] border border-[#E6E2D8]"
              >
                Packing List
              </button>
            )}
            {onOpenDiagnostics && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenDiagnostics();
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-[#858B84] bg-[#FFFFFF] border border-[#E6E2D8]"
              >
                Diagnostics
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onExportPdf();
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-[#243C32] bg-[#FFFFFF] border border-[#E6E2D8]"
              >
                Export PDF
              </button>
            )}
          </div>

          {/* Mobile User Section */}
          <div className="pt-3 border-t border-[#E6E2D8]">
            {currentUser ? (
              <div className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#E6E2D8] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentUser.preferences?.avatarUrl ? (
                    <img
                      src={currentUser.preferences.avatarUrl}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-[#243C32] text-[#FFFFFF] flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-[#343A36]">{currentUser.name}</div>
                    <div className="text-[10px] text-[#858B84] truncate max-w-[150px]">{currentUser.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="px-2.5 py-1.5 text-[#D68B65] hover:bg-[#D68B65]/10 rounded-lg text-xs flex items-center gap-1 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  if (onOpenAuth) onOpenAuth('signup');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#243C32] text-[#FFFFFF] flex items-center justify-center gap-2 shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign Up / Log In</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
