import React, { useState } from 'react';
import { CostEstimationBreakdown } from '../types/travel';
import { useLanguage } from '../context/LanguageContext';
import { RefreshCw, Copy, Check, FileDown } from 'lucide-react';

interface AICostEstimationCardProps {
  estimation: CostEstimationBreakdown | null;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateParams?: (params: {
    travelersCount?: number;
    tripDurationDays?: number;
    travelStyle?: 'budget' | 'moderate' | 'luxury';
  }) => void;
  customBudgetAmount?: number;
  onOpenExportSheet?: () => void;
}

export const AICostEstimationCard: React.FC<AICostEstimationCardProps> = ({
  estimation,
  isLoading,
  onRefresh,
  onUpdateParams,
  customBudgetAmount,
  onOpenExportSheet,
}) => {
  const { currencySymbol } = useLanguage();
  const [activeTab, setActiveTab] = useState<'breakdown' | 'tips' | 'platforms'>('breakdown');
  const [copied, setCopied] = useState(false);

  if (isLoading && !estimation) {
    return (
      <div className="py-8 border-b border-[#E6E2D8] flex items-center gap-2 text-sm text-[#858B84]">
        <RefreshCw className="w-4 h-4 animate-spin text-[#243C32]" />
        <span>Calculating trip cost estimate...</span>
      </div>
    );
  }

  if (!estimation) return null;

  const sym = estimation.currencySymbol || currencySymbol || '₹';
  const isOverBudget =
    typeof customBudgetAmount === 'number' &&
    customBudgetAmount > 0 &&
    estimation.totalEstimatedCost > customBudgetAmount;

  const handleCopySummary = () => {
    const summary = `${estimation.tripDurationDays}-day estimate for ${estimation.travelersCount} traveller(s): ${sym}${estimation.totalEstimatedCost.toLocaleString()} (${sym}${estimation.costPerPerson.toLocaleString()}/person). ${estimation.aiSummary}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rows = [
    {
      label: 'Transport & Transit',
      note: `${estimation.categories.travelCost.mode} · ${Math.round(estimation.categories.travelCost.distanceKm)} km`,
      amount: estimation.categories.travelCost.amount,
    },
    {
      label: 'Accommodation',
      note: `${estimation.categories.shelterAccommodation.nights} nights · ${estimation.categories.shelterAccommodation.tier}`,
      amount: estimation.categories.shelterAccommodation.amount,
    },
    {
      label: 'Meals & Dining',
      note: `~${sym}${Math.round(estimation.categories.foodAndDining.dailyAverage).toLocaleString()}/day`,
      amount: estimation.categories.foodAndDining.amount,
    },
    {
      label: 'Tickets & Entries',
      note: `${estimation.categories.entranceFees.items.length} attraction entries`,
      amount: estimation.categories.entranceFees.amount,
    },
    {
      label: 'Local Incidentals',
      note: estimation.categories.otherExpenses.explanation,
      amount: estimation.categories.otherExpenses.amount,
    },
  ];

  return (
    <section className="py-6 border-b border-[#E6E2D8] space-y-5">
      {/* Open Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            Estimated Trip Cost
          </p>
          <div className="flex flex-wrap items-baseline gap-3 mt-1">
            <span className="font-display text-3xl sm:text-4xl font-semibold text-[#343A36]">
              {sym}{Math.round(estimation.totalEstimatedCost).toLocaleString()}
            </span>
            <span className="text-sm text-[#858B84]">
              {sym}{Math.round(estimation.costPerPerson).toLocaleString()} per traveller
            </span>
            {customBudgetAmount && customBudgetAmount > 0 && (
              <span className={`text-xs font-medium ${isOverBudget ? 'text-[#D68B65]' : 'text-[#243C32]'}`}>
                {isOverBudget
                  ? `Above target (${sym}${customBudgetAmount.toLocaleString()})`
                  : `Within target (${sym}${customBudgetAmount.toLocaleString()})`}
              </span>
            )}
          </div>
        </div>

        {/* Inline Style / Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {onUpdateParams && (
            <div className="inline-flex items-center gap-1 border border-[#E6E2D8] rounded-full bg-[#FFFFFF] p-1">
              {(['budget', 'moderate', 'luxury'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onUpdateParams({ travelStyle: style })}
                  className={`px-3 py-1 rounded-full capitalize transition-colors ${
                    estimation.travelStyle === style
                      ? 'bg-[#243C32] text-[#FFFFFF] font-medium'
                      : 'text-[#858B84] hover:text-[#343A36]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-full text-[#858B84] hover:text-[#243C32]"
            aria-label="Refresh cost estimate"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1 text-[#858B84] hover:text-[#343A36]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#243C32]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onOpenExportSheet && (
            <button
              type="button"
              onClick={onOpenExportSheet}
              className="inline-flex items-center gap-1 text-[#243C32] font-medium hover:underline"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Underlined Tabs */}
      <div className="border-b border-[#E6E2D8] flex items-center gap-6 text-sm">
        {[
          { id: 'breakdown' as const, label: 'Breakdown' },
          { id: 'tips' as const, label: 'Practical Notes' },
          { id: 'platforms' as const, label: 'Transit Fares' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-2.5 transition-colors ${
              activeTab === tab.id ? 'text-[#243C32] font-semibold' : 'text-[#858B84] hover:text-[#343A36]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#243C32] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'breakdown' && (
        <div className="divide-y divide-[#E6E2D8]">
          {rows.map((row) => (
            <div key={row.label} className="py-3 flex items-center justify-between gap-4 text-sm">
              <div>
                <div className="font-medium text-[#343A36]">{row.label}</div>
                <div className="text-xs text-[#858B84]">{row.note}</div>
              </div>
              <div className="font-semibold text-[#343A36] shrink-0">
                {sym}{Math.round(row.amount).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="space-y-2.5 text-sm text-[#343A36]">
          <p className="text-[#858B84] leading-relaxed">{estimation.aiSummary}</p>
          <ul className="space-y-1.5 list-disc pl-5 text-xs text-[#343A36]">
            {estimation.budgetTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-2 text-sm">
          <div>
            <span className="block text-xs text-[#858B84]">Cab / Uber</span>
            <span className="font-semibold text-[#343A36]">
              {sym}{Math.round(estimation.categories.travelCost.platformEstimates?.uber || estimation.categories.travelCost.amount).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#858B84]">Two-Wheeler / Rapido</span>
            <span className="font-semibold text-[#343A36]">
              {sym}{Math.round(estimation.categories.travelCost.platformEstimates?.rapido || estimation.categories.travelCost.amount * 0.45).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#858B84]">Personal Fuel</span>
            <span className="font-semibold text-[#343A36]">
              {sym}{Math.round(estimation.categories.travelCost.platformEstimates?.fuel || estimation.categories.travelCost.amount * 0.6).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#858B84]">Public Bus / Rail</span>
            <span className="font-semibold text-[#343A36]">
              {sym}{Math.round(estimation.categories.travelCost.platformEstimates?.publicTransit || estimation.categories.travelCost.amount * 0.25).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default AICostEstimationCard;
