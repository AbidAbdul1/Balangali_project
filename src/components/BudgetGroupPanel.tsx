import React, { useState, useEffect } from 'react';
import {
  ExpenseCategory,
  ExpenseItem,
  GroupMember,
  BalanceDebt,
  SettlementRecord,
  ItineraryPlan,
} from '../types/travel';
import {
  Wallet,
  Users,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Share2,
  MessageCircle,
  Send,
  Smartphone,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Trains',
  'Buses',
  'Local Transportation',
  'Taxi',
  'Hotels',
  'Food',
  'Attractions',
  'Shopping',
  'Activities',
  'Other',
];

export interface BudgetGroupPanelProps {
  itinerary: ItineraryPlan | null;
  travelersCount: number;
  customBudgetAmount?: number;
  onNotify: (msg: string) => void;
  onJoinSharedTrip?: (trip: ItineraryPlan, tripId: string) => void;
}

export const BudgetGroupPanel: React.FC<BudgetGroupPanelProps> = ({
  itinerary,
  travelersCount,
  customBudgetAmount,
  onNotify,
  onJoinSharedTrip,
}) => {
  const initialTripId = itinerary?.id || 'trip-pilot-vijayawada-classic';
  const [activeTripId, setActiveTripId] = useState<string>(initialTripId);

  useEffect(() => {
    if (itinerary?.id && itinerary.id !== activeTripId) {
      setActiveTripId(itinerary.id);
    }
  }, [itinerary?.id]);

  const durationDays = Math.max(1, itinerary?.days.length || 1);
  const estimatedBudget = customBudgetAmount || itinerary?.totalEstimatedBudgetINR || 4500;

  // Expenses & Balances
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [debts, setDebts] = useState<BalanceDebt[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [isLoadingAll, setIsLoadingAll] = useState<boolean>(false);

  // Add Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Food');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('You');
  const [expSplitType, setExpSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [expParticipantsText, setExpParticipantsText] = useState('You');
  const [expCustomValues, setExpCustomValues] = useState<Record<string, string>>({});

  // Group Member invite form (email now optional)
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // AI Cost Optimizer
  const [optPriority, setOptPriority] = useState<'lowest-cost' | 'shortest-time' | 'best-comfort' | 'balanced'>('balanced');
  const [optResult, setOptResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Currency Converter
  const [ratesData, setRatesData] = useState<{ rates: Record<string, number>; conversionDate: string; source: string } | null>(null);
  const [targetCurrency, setTargetCurrency] = useState('USD');

  const loadAll = async (targetId: string = activeTripId) => {
    setIsLoadingAll(true);
    try {
      const [expRes, memRes, balRes, rateRes] = await Promise.all([
        fetch(`/api/trips/${targetId}/expenses`),
        fetch(`/api/trips/${targetId}/members`),
        fetch(`/api/trips/${targetId}/balances`),
        fetch('/api/currency/rates'),
      ]);
      if (expRes.ok) {
        const d = await expRes.json();
        setExpenses(d.expenses || []);
      }
      if (memRes.ok) {
        const d = await memRes.json();
        setMembers(d.members || []);
        setShareCode(d.shareCode || null);
        if (d.members?.length > 0) {
          setExpParticipantsText(d.members.map((m: GroupMember) => m.name).join(', '));
          setExpPaidBy(d.members[0].name);
        }
      }
      if (balRes.ok) {
        const d = await balRes.json();
        setDebts(d.debts || []);
        setSettlements(d.settlements || []);
        setTotalSpent(d.totalExpenditure || 0);
      }
      if (rateRes.ok) {
        const d = await rateRes.json();
        setRatesData({ rates: d.rates, conversionDate: d.conversionDate, source: d.source });
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    loadAll(activeTripId);
  }, [activeTripId]);

  const parsedParticipants = expParticipantsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!expTitle.trim() || isNaN(amt) || amt <= 0) {
      onNotify('Enter a valid expense title and positive amount.');
      return;
    }

    const participants = parsedParticipants.map((name) => ({
      memberName: name,
      amount: expSplitType === 'custom' ? parseFloat(expCustomValues[name] || '0') : undefined,
      percentage: expSplitType === 'percentage' ? parseFloat(expCustomValues[name] || '0') : undefined,
    }));

    const res = await fetch(`/api/trips/${activeTripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: expTitle.trim(),
        category: expCategory,
        amount: amt,
        currency: 'INR',
        paidByName: expPaidBy.trim() || 'You',
        splitType: expSplitType,
        participants,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setExpTitle('');
      setExpAmount('');
      onNotify(`Added expense "${data.expense.title}" (₹${amt.toLocaleString()}).`);
      loadAll();
    } else {
      onNotify(data.error || 'Could not add expense.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await fetch(`/api/trips/${activeTripId}/expenses/${expenseId}`, { method: 'DELETE' });
    loadAll();
  };

  const handleSettleDebt = async (debt: BalanceDebt) => {
    const res = await fetch(`/api/trips/${activeTripId}/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromName: debt.from,
        toName: debt.to,
        amount: debt.amount,
        currency: debt.currency,
      }),
    });
    if (res.ok) {
      onNotify(`Recorded settlement: ${debt.from} paid ${debt.to} ₹${debt.amount.toLocaleString()}`);
      loadAll();
    }
  };

  // Name alone is now allowed — email is optional!
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      onNotify('Enter the companion\'s name.');
      return;
    }
    const res = await fetch(`/api/trips/${activeTripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setMemberName('');
      setMemberEmail('');
      onNotify(`Added companion ${data.member.name} (${data.member.role}).`);
      loadAll();
    } else {
      onNotify(data.error || 'Could not add companion.');
    }
  };

  // Join group via 6-character Room Code (Ludo style)
  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      onNotify('Enter the 6-character room code.');
      return;
    }
    setIsJoining(true);
    try {
      const res = await fetch(`/api/trips/join/${encodeURIComponent(cleanCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinNameInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setJoinCodeInput('');
        setJoinNameInput('');
        if (data.tripId) {
          setActiveTripId(data.tripId);
          loadAll(data.tripId);
        }
        if (onJoinSharedTrip && data.trip) {
          onJoinSharedTrip(data.trip, data.tripId);
        }
        onNotify(`Joined trip room: ${data.trip?.title || cleanCode}! You are now synced with your friends.`);
      } else {
        onNotify(data.error || 'Invalid or expired room code. Please check with your trip host.');
      }
    } catch {
      onNotify('Unable to connect to trip room.');
    } finally {
      setIsJoining(false);
    }
  };

  const getShareText = () => {
    const tripTitle = itinerary?.title || 'Trip';
    const code = shareCode || 'TRAVEL';
    return `Join our trip group for "${tripTitle}" on AI-TravelMate!\nRoom Code: ${code}\nEnter this code in your AI-TravelMate app under "Group & Split" to join.`;
  };

  const handleCopyCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    setCopiedCode(true);
    onNotify(`Copied room code "${shareCode}" to clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Multi-App Share using Web Share API
  const handleShareAllApps = async () => {
    if (!shareCode) return;
    const shareText = getShareText();
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join Trip Room: ${shareCode}`,
          text: shareText,
          url: shareUrl,
        });
        onNotify('Shared trip room code.');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    // Fallback: copy formatted text to clipboard
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    onNotify('Room invite link & code copied! Paste into any chat app.');
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/budget/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: optPriority,
          tripDurationDays: durationDays,
          travelersCount,
          originalEstimatedCostINR: estimatedBudget,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOptResult(data);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const remainingBudget = estimatedBudget - totalSpent;
  const isOverBudget = remainingBudget < 0;
  const rate = ratesData?.rates?.[targetCurrency] || 0;

  const categoryTotals = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  const shareTextEncoded = encodeURIComponent(getShareText());

  return (
    <div className="space-y-10 py-2">
      {/* Editorial Header */}
      <div className="pb-6 border-b border-[#E6E2D8] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91A995]">
            Group Collaboration &amp; Fair Splits
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#343A36] mt-1">
            Group Trip &amp; Split
          </h2>
          <p className="text-sm text-[#858B84] mt-1">
            Generate a Ludo-style Room Code for your companions, share it instantly to any chat app, and balance expenses with zero friction.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAll(activeTripId)}
          disabled={isLoadingAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D2C5] text-xs font-medium text-[#343A36] hover:bg-[#FFFFFF] transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAll ? 'animate-spin text-[#243C32]' : ''}`} />
          <span>Refresh data</span>
        </button>
      </div>

      {/* SECTION 1: LUDO-STYLE ROOM CODE & MULTI-APP SHARE BANNER */}
      <section className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#91A995]/15 text-[#243C32] text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Trip Room Code (Ludo-Style)</span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#343A36]">
              Invite friends with a unique Room Code
            </h3>
            <p className="text-sm text-[#858B84] leading-relaxed">
              No email required. Share this 6-character room code to WhatsApp, Telegram, or any chat app. Friends simply enter the code in their own app to join your trip instantly.
            </p>
          </div>

          {/* Prominent 6-Character Room Code Display */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="px-5 py-3 rounded-2xl bg-[#F7F5EF] border border-[#E6E2D8] text-center">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#858B84]">
                Room Code
              </span>
              <span className="font-mono text-3xl font-extrabold tracking-[0.25em] text-[#243C32]">
                {shareCode || '······'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Multi-App Share Buttons */}
        <div className="pt-4 border-t border-[#E6E2D8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#858B84] mr-1">Share code to:</span>

            {/* Native Web Share API */}
            <button
              type="button"
              onClick={handleShareAllApps}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#243C32] text-[#FFFFFF] text-xs font-medium hover:bg-[#1B2E26] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to All Apps</span>
            </button>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${shareTextEncoded}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-xs font-medium text-[#343A36] hover:border-[#243C32] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#243C32]" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${shareTextEncoded}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-xs font-medium text-[#343A36] hover:border-[#243C32] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-[#243C32]" />
              <span>Telegram</span>
            </a>

            {/* SMS */}
            <a
              href={`sms:?body=${shareTextEncoded}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-xs font-medium text-[#343A36] hover:border-[#243C32] transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#858B84]" />
              <span>SMS</span>
            </a>
          </div>

          <div className="text-xs text-[#858B84]">
            Active Trip ID: <span className="font-mono text-[#343A36]">{activeTripId}</span>
          </div>
        </div>

        {/* Join Group via Room Code Form */}
        <div className="pt-4 border-t border-[#E6E2D8] bg-[#F7F5EF] -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-5 sm:p-6 rounded-b-3xl">
          <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="text-xs font-semibold text-[#343A36] shrink-0">
              Have a Room Code?
            </span>
            <input
              type="text"
              placeholder="e.g. ABC123"
              maxLength={8}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-xs font-mono font-bold tracking-wider text-[#343A36] placeholder-[#858B84] uppercase focus:outline-none focus:border-[#243C32]"
            />
            <input
              type="text"
              placeholder="Your name (optional)"
              value={joinNameInput}
              onChange={(e) => setJoinNameInput(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E6E2D8] text-xs text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
            />
            <button
              type="submit"
              disabled={isJoining || !joinCodeInput.trim()}
              className="px-5 py-2 rounded-xl bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-xs font-medium transition-colors disabled:opacity-40"
            >
              {isJoining ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
      </section>

      {/* SECTION 2: BUDGET KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-[#858B84]">Estimated Budget</span>
          <div className="font-display text-2xl font-bold text-[#343A36]">₹{estimatedBudget.toLocaleString()}</div>
          <p className="text-xs text-[#858B84]">₹{Math.round(estimatedBudget / durationDays).toLocaleString()}/day · ₹{Math.round(estimatedBudget / Math.max(1, travelersCount)).toLocaleString()}/traveller</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-[#858B84]">Actual Recorded Spend</span>
          <div className="font-display text-2xl font-bold text-[#243C32]">₹{totalSpent.toLocaleString()}</div>
          <p className="text-xs text-[#858B84]">{expenses.length} recorded expense(s)</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#858B84]">Remaining Balance</span>
            {isOverBudget ? <AlertTriangle className="w-3.5 h-3.5 text-[#D68B65]" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#243C32]" />}
          </div>
          <div className={`font-display text-2xl font-bold ${isOverBudget ? 'text-[#D68B65]' : 'text-[#343A36]'}`}>
            ₹{remainingBudget.toLocaleString()}
          </div>
          <p className="text-xs text-[#858B84]">{isOverBudget ? 'Exceeding planned target' : 'Within budget target'}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#858B84]">Currency Convert</span>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="text-xs bg-[#F7F5EF] border border-[#E6E2D8] rounded-lg px-2 py-0.5 text-[#343A36]"
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'THB'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="font-display text-2xl font-bold text-[#343A36]">
            {rate > 0 ? `${(estimatedBudget * rate).toFixed(2)} ${targetCurrency}` : '—'}
          </div>
          <p className="text-[11px] text-[#858B84]">{ratesData?.conversionDate || 'Live rates'}</p>
        </div>
      </section>

      {/* SECTION 3: AI TRIP COST OPTIMIZER */}
      <section className="bg-[#FFFFFF] border border-[#E6E2D8] rounded-3xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#243C32]">
              <Sparkles className="w-3.5 h-3.5 text-[#D68B65]" />
              <span>AI Trip Cost Optimizer</span>
            </div>
            <h3 className="font-display text-lg font-semibold text-[#343A36]">
              Simulate Cost, Time &amp; Comfort Tradeoffs
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'lowest-cost', label: 'Lowest Cost' },
                { id: 'shortest-time', label: 'Fastest' },
                { id: 'best-comfort', label: 'Best Comfort' },
                { id: 'balanced', label: 'Balanced' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOptPriority(opt.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  optPriority === opt.id
                    ? 'bg-[#243C32] text-[#FFFFFF]'
                    : 'bg-[#F7F5EF] text-[#343A36] hover:bg-[#EFECE4]'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleRunOptimizer}
              disabled={isOptimizing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#243C32] text-[#FFFFFF] text-xs font-medium hover:bg-[#1B2E26] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>Optimize</span>
            </button>
          </div>
        </div>

        {optResult && (
          <div className="pt-4 border-t border-[#E6E2D8] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-medium text-[#343A36]">{optResult.summary}</p>
              <span className="px-2.5 py-1 rounded-full bg-[#91A995]/20 text-[#243C32] font-semibold">
                {optResult.potentialSavingsINR >= 0
                  ? `Est. Savings: ₹${optResult.potentialSavingsINR.toLocaleString()}`
                  : `Delta: +₹${Math.abs(optResult.potentialSavingsINR).toLocaleString()}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {optResult.categoryChanges.map((c: any) => (
                <div key={c.category} className="p-3 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-xs space-y-1">
                  <span className="text-[#858B84]">{c.category}</span>
                  <div className="flex items-center gap-2 font-semibold text-[#343A36]">
                    <span className="line-through text-[#858B84]">₹{c.originalINR}</span>
                    <ArrowRight className="w-3 h-3 text-[#243C32]" />
                    <span>₹{c.optimizedINR}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#858B84]">{optResult.disclaimer}</p>
          </div>
        )}
      </section>

      {/* SECTION 4: TWO COLUMNS — EXPENSE TRACKER & COMPANIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Expense Tracker & Splitter */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#243C32]" />
              <span>Record &amp; Split Expense</span>
            </h3>

            <form onSubmit={handleAddExpense} className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                placeholder="Title (e.g. Dinner, Train tickets, Hotel)"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              />

              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Amount (INR)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              />

              <input
                type="text"
                placeholder="Paid by (e.g. You, Aarav)"
                value={expPaidBy}
                onChange={(e) => setExpPaidBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              />

              <select
                value={expSplitType}
                onChange={(e) => setExpSplitType(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              >
                <option value="equal">Split Equally</option>
                <option value="custom">Split Custom Amounts (₹)</option>
                <option value="percentage">Split by Percentage (%)</option>
              </select>

              <input
                type="text"
                placeholder="Companions (comma-separated names)"
                value={expParticipantsText}
                onChange={(e) => setExpParticipantsText(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
              />

              {expSplitType !== 'equal' && parsedParticipants.length > 0 && (
                <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {parsedParticipants.map((p) => (
                    <label key={p} className="text-[11px] text-[#343A36] flex flex-col gap-1">
                      <span className="font-medium">{p} ({expSplitType === 'percentage' ? '%' : '₹'})</span>
                      <input
                        type="number"
                        step="0.01"
                        value={expCustomValues[p] || ''}
                        onChange={(e) => setExpCustomValues((prev) => ({ ...prev, [p]: e.target.value }))}
                        className="px-2 py-1 rounded-lg bg-[#F7F5EF] border border-[#E6E2D8] text-xs text-[#343A36]"
                      />
                    </label>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="sm:col-span-2 py-2.5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &amp; Split Expense</span>
              </button>
            </form>
          </div>

          {/* Category Badges */}
          {categoryTotals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryTotals.map((c) => (
                <span key={c.category} className="px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-xs text-[#343A36]">
                  {c.category}: <strong>₹{c.total.toLocaleString()}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Expense Log List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#858B84]">Logged Expenses</h4>
            {expenses.length === 0 ? (
              <p className="text-xs text-[#858B84] py-4">No expenses recorded for this trip room yet.</p>
            ) : (
              <div className="divide-y divide-[#E6E2D8] border-t border-b border-[#E6E2D8]">
                {expenses.map((exp) => (
                  <div key={exp.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-medium text-[#343A36]">
                        {exp.title} <span className="text-[#858B84]">({exp.category})</span>
                      </div>
                      <div className="text-[11px] text-[#858B84]">
                        Paid by <strong>{exp.paidByName}</strong> · {exp.splitType} split ({exp.splits.map((s) => `${s.memberName}: ₹${s.amount}`).join(', ')})
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-[#343A36]">₹{exp.amount.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-[#858B84] hover:text-[#D68B65]"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Companions & Balances */}
        <div className="lg:col-span-5 space-y-8">
          {/* Companions & Permissions */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#243C32]" />
              <span>Trip Companions</span>
            </h3>

            {/* Add Companion without requiring email */}
            <form onSubmit={handleInviteMember} className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Companion name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36] focus:outline-none focus:border-[#243C32]"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                >
                  <option value="editor">Editor (Can log expenses)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="owner">Owner</option>
                </select>

                <button
                  type="submit"
                  className="flex-1 py-2 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-xs font-medium transition-colors"
                >
                  Add Companion
                </button>
              </div>
            </form>

            {/* Companion List */}
            {members.length > 0 && (
              <div className="divide-y divide-[#E6E2D8] border-t border-b border-[#E6E2D8]">
                {members.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#343A36]">{m.name}</span>
                      {m.email && !m.email.endsWith('@room.local') && (
                        <span className="text-[#858B84] ml-2">{m.email}</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F7F5EF] border border-[#E6E2D8] text-[10px] font-semibold text-[#243C32] uppercase">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balances & Settlement */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#243C32]" />
              <span>Outstanding Balances</span>
            </h3>

            {debts.length === 0 ? (
              <p className="text-xs text-[#243C32] p-4 rounded-2xl bg-[#91A995]/15 font-medium">
                All group expenses are settled!
              </p>
            ) : (
              <div className="space-y-2">
                {debts.map((d, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] flex items-center justify-between text-xs">
                    <div>
                      <strong>{d.from}</strong> owes <strong>{d.to}</strong>{' '}
                      <span className="font-bold text-[#D68B65]">₹{d.amount.toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSettleDebt(d)}
                      className="px-3 py-1 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] font-medium text-xs transition-colors"
                    >
                      Settle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {settlements.length > 0 && (
              <div className="pt-2 space-y-1 text-xs text-[#858B84]">
                <span className="font-semibold text-[#343A36] block">Recent Settlements:</span>
                {settlements.slice(0, 4).map((s) => (
                  <div key={s.id}>
                    ✓ {s.fromName} paid {s.toName} ₹{s.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetGroupPanel;
