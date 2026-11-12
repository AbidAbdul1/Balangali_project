import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Shirt, FileText, Globe2, Coins, BarChart2, ChevronDown, ChevronUp, Check } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<'lang' | 'curr' | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={dockRef} className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5 no-print">
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-end gap-1.5"
          >
            {/* 1. Budget & Group */}
            <button
              type="button"
              onClick={() => onSelectTab('budget')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-md border backdrop-blur-md cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
              title="Open Budget & Group Expense Manager"
            >
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Budget &amp; Group</span>
            </button>

            {/* 2. Packing */}
            <button
              type="button"
              onClick={onOpenPackingList}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 border border-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
              title="Open Smart Packing Checklist"
            >
              <Shirt className="w-3.5 h-3.5 text-indigo-500" />
              <span>Packing</span>
            </button>

            {/* 3. Export PDF */}
            <button
              type="button"
              onClick={onOpenExportSheet}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 border border-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
              title="Export PDF / Offline Travel Sheet"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export PDF</span>
            </button>

            {/* 4. Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'lang' ? null : 'lang')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 border border-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
                title="Change Language"
              >
                <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentLangObj.flag} {currentLangObj.nativeName}</span>
              </button>

              {openMenu === 'lang' && (
                <div className="absolute right-full bottom-0 mr-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setOpenMenu(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        language === lang.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span>{lang.flag} {lang.nativeName}</span>
                      {language === lang.code && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Currency Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'curr' ? null : 'curr')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 border border-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
                title="Change Display Currency"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>{currency}</span>
              </button>

              {openMenu === 'curr' && (
                <div className="absolute right-full bottom-0 mr-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code);
                        setOpenMenu(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        currency === c.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span>{c.label}</span>
                      {currency === c.code && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Diagnostics */}
            <button
              type="button"
              onClick={onOpenDiagnostics}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/95 text-slate-800 border border-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
              title="Open System & Model Diagnostics"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Diagnostics</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse / Expand Toggle Pill */}
      <button
        type="button"
        onClick={() => {
          setIsCollapsed((v) => !v);
          setOpenMenu(null);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-900 text-white shadow-lg border border-slate-700 hover:bg-slate-800 cursor-pointer"
      >
        {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{isCollapsed ? 'Quick Tools' : 'Hide Tools'}</span>
      </button>
    </div>
  );
};

