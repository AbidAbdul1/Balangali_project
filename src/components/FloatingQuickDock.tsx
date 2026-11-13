import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  Shirt,
  FileText,
  Globe2,
  Coins,
  BarChart2,
  SlidersHorizontal,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useLanguage, CurrencyCode } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { NavTab } from './Navbar';

interface FloatingQuickDockProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPackingList: () => void;
  onOpenExportSheet: () => void;
  onOpenDiagnostics: () => void;
}

const CURRENCIES: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: 'INR', label: 'INR (₹)', symbol: '₹' },
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'JPY', label: 'JPY (¥)', symbol: '¥' },
];

export const FloatingQuickDock: React.FC<FloatingQuickDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenPackingList,
  onOpenExportSheet,
  onOpenDiagnostics,
}) => {
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<'lang' | 'curr' | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSubMenu(null);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={dockRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 w-72 bg-white/98 backdrop-blur-2xl rounded-3xl border border-[#E8EAF2] shadow-[0_24px_48px_-12px_rgba(16,24,40,0.18)] p-3.5 overflow-hidden"
          >
            <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-[#E8EAF2]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5145E5] block">
                  Travel Utilities
                </span>
                <span className="text-xs font-bold text-[#101828]">
                  Quick Actions &amp; Preferences
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSubMenu(null);
                }}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#101828] hover:bg-[#F7F8FC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {/* 1. Budget & Group */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab('budget');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'budget'
                    ? 'bg-brand-gradient text-white shadow-sm'
                    : 'text-[#101828] hover:bg-[#F7F8FC]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      activeTab === 'budget'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#14B8A6]/10 text-[#14B8A6]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                  </span>
                  <span>Budget &amp; Group Split</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* 2. Packing Checklist */}
              <button
                type="button"
                onClick={() => {
                  onOpenPackingList();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#101828] hover:bg-[#F7F8FC] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#5145E5]/10 text-[#5145E5] flex items-center justify-center">
                    <Shirt className="w-3.5 h-3.5" />
                  </span>
                  <span>Smart Packing Checklist</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {/* 3. Export PDF */}
              <button
                type="button"
                onClick={() => {
                  onOpenExportSheet();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#101828] hover:bg-[#F7F8FC] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#8067F5]/10 text-[#8067F5] flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span>Export PDF Travel Sheet</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {/* 4. Language Selector */}
              <div className="pt-1 border-t border-[#E8EAF2]">
                <button
                  type="button"
                  onClick={() => setSubMenu(subMenu === 'lang' ? null : 'lang')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#101828] hover:bg-[#F7F8FC] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                      <Globe2 className="w-3.5 h-3.5" />
                    </span>
                    <span>Language</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#5145E5] bg-[#5145E5]/10 px-2 py-0.5 rounded-lg">
                    {currentLangObj.flag} {currentLangObj.nativeName}
                  </span>
                </button>

                {subMenu === 'lang' && (
                  <div className="mt-1 p-1.5 bg-[#F7F8FC] rounded-2xl border border-[#E8EAF2] grid grid-cols-2 gap-1">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setSubMenu(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                          language === lang.code
                            ? 'bg-[#5145E5] text-white font-bold'
                            : 'text-[#101828] hover:bg-white'
                        }`}
                      >
                        <span className="truncate">
                          {lang.flag} {lang.nativeName}
                        </span>
                        {language === lang.code && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Currency Selector */}
              <div>
                <button
                  type="button"
                  onClick={() => setSubMenu(subMenu === 'curr' ? null : 'curr')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#101828] hover:bg-[#F7F8FC] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </span>
                    <span>Currency</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                    {currency}
                  </span>
                </button>

                {subMenu === 'curr' && (
                  <div className="mt-1 p-1.5 bg-[#F7F8FC] rounded-2xl border border-[#E8EAF2] flex flex-wrap gap-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code);
                          setSubMenu(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                          currency === c.code
                            ? 'bg-[#5145E5] text-white font-bold'
                            : 'bg-white text-[#101828] hover:bg-slate-100 border border-[#E8EAF2]'
                        }`}
                      >
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Diagnostics */}
              <div className="pt-1 border-t border-[#E8EAF2]">
                <button
                  type="button"
                  onClick={() => {
                    onOpenDiagnostics();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-[#101828] hover:bg-[#F7F8FC] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <BarChart2 className="w-3.5 h-3.5" />
                    </span>
                    <span>System Diagnostics</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Utility Pill Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          setSubMenu(null);
        }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#101828] text-white shadow-[0_12px_30px_-4px_rgba(16,24,40,0.4)] ring-1 ring-white/15 hover:bg-[#1E293B] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Open Travel Utilities, Packing, Export, Currency & Language"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#14B8A6]" />
        <span>Utilities</span>
        <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full text-white/90">
          {currency} · {currentLangObj.code.toUpperCase()}
        </span>
      </button>
    </div>
  );
};
