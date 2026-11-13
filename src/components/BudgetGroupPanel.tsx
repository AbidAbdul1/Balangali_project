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

interface BudgetGroupPanelProps {
  itinerary: ItineraryPlan | null;
  travelersCount: number;
  customBudgetAmount?: number;
  onNotify: (msg: string) => void;
}

export const BudgetGroupPanel: React.FC<BudgetGroupPanelProps> = ({
  itinerary,
  travelersCount,
  customBudgetAmount,
  onNotify,
}) => {
  const tripId = itinerary?.id || 'trip-pilot-vijayawada-classic';
  const durationDays = Math.max(1, itinerary?.days.length || 1);
  const estimatedBudget = customBudgetAmount || itinerary?.totalEstimatedBudgetINR || 4500;

  // Expenses & Balances
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [debts, setDebts] = useState<BalanceDebt[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  // Add Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Food');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('You');
  const [expSplitType, setExpSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [expParticipantsText, setExpParticipantsText] = useState('You');
  const [expCustomValues, setExpCustomValues] = useState<Record<string, string>>({});

  // Group Member invite form
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // AI Cost Optimizer
  const [optPriority, setOptPriority] = useState<'lowest-cost' | 'shortest-time' | 'best-comfort' | 'balanced'>('balanced');
  const [optResult, setOptResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Currency Converter
  const [ratesData, setRatesData] = useState<{ rates: Record<string, number>; conversionDate: string; source: string } | null>(null);
  const [targetCurrency, setTargetCurrency] = useState('USD');

  const loadAll = async () => {
    try {
      const [expRes, memRes, balRes, rateRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/expenses`),
        fetch(`/api/trips/${tripId}/members`),
        fetch(`/api/trips/${tripId}/balances`),
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
      // ignore offline
    }
  };

  useEffect(() => {
    loadAll();
  }, [tripId]);

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

    const res = await fetch(`/api/trips/${tripId}/expenses`, {
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
      onNotify(`Added expense "${data.expense.title}" (₹${amt}).`);
      loadAll();
    } else {
      onNotify(data.error || 'Could not add expense.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });
    loadAll();
  };

  const handleSettleDebt = async (debt: BalanceDebt) => {
    const res = await fetch(`/api/trips/${tripId}/settlements`, {
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
      onNotify(`Recorded settlement: ${debt.from} paid ${debt.to} ₹${debt.amount}`);
      loadAll();
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) return;
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: memberName.trim(), email: memberEmail.trim(), role: memberRole }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setMemberName('');
      setMemberEmail('');
      onNotify(`Invited ${data.member.name} (${data.member.role}).`);
      loadAll();
    } else {
      onNotify(data.error || 'Invite failed.');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) return;
    const res = await fetch(`/api/trips/join/${encodeURIComponent(joinCodeInput.trim())}`, { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      setJoinCodeInput('');
      onNotify(`Joined shared trip: ${data.trip.title}`);
    } else {
      onNotify(data.error || 'Invalid share code.');
    }
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

  // Category totals
  const categoryTotals = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      {/* Top Budget Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-hero-midnight text-white rounded-3xl p-5 shadow-lg">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#14B8A6]">
            Estimated Total Budget
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
            ₹{estimatedBudget.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            ₹{Math.round(estimatedBudget / durationDays).toLocaleString()}/day · ₹{Math.round(estimatedBudget / Math.max(1, travelersCount)).toLocaleString()}/person
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E8EAF2] p-5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Actual Recorded Spend
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-[#5145E5] mt-1 font-mono">
            ₹{totalSpent.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">{expenses.length} logged expense(s)</div>
        </div>

        <div className={`rounded-3xl border p-5 shadow-xs ${isOverBudget ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={isOverBudget ? 'text-rose-700' : 'text-emerald-700'}>Remaining Budget</span>
            {isOverBudget ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
          <div className={`font-display text-2xl sm:text-3xl font-black mt-1 font-mono ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
            ₹{remainingBudget.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {isOverBudget ? 'Over budget — run AI Cost Optimizer below' : 'Within planned trip budget'}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E8EAF2] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            <span>Currency Converter</span>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="px-2 py-0.5 rounded-lg border border-[#E8EAF2] bg-[#F7F8FC] text-xs font-bold text-[#101828]"
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'THB'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-[#101828] mt-1 font-mono">
            {rate > 0 ? `${(estimatedBudget * rate).toFixed(2)} ${targetCurrency}` : '—'}
          </div>
          <div className="text-[10px] text-[#64748B] mt-1">
            Rate date: {ratesData?.conversionDate || 'N/A'} ({ratesData?.source || 'loading'})
          </div>
        </div>
      </div>

      {/* AI Cost Optimizer */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="w-4 h-4" />
              AI Trip Cost Optimizer
            </div>
            <h3 className="font-display text-lg font-extrabold text-slate-900 mt-0.5">
              Compare Cost, Time & Comfort Tradeoffs
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'lowest-cost', label: 'Lowest Total Cost' },
                { id: 'shortest-time', label: 'Shortest Travel Time' },
                { id: 'best-comfort', label: 'Best Comfort' },
                { id: 'balanced', label: 'Balanced' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOptPriority(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  optPriority === opt.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              onClick={handleRunOptimizer}
              disabled={isOptimizing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              Optimize
            </button>
          </div>
        </div>

        {optResult && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">{optResult.summary}</p>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                {optResult.potentialSavingsINR >= 0
                  ? `Est. Savings: ₹${optResult.potentialSavingsINR.toLocaleString()}`
                  : `Upgrade Delta: +₹${Math.abs(optResult.potentialSavingsINR).toLocaleString()}`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {optResult.categoryChanges.map((c: any) => (
                <div key={c.category} className="bg-white rounded-lg border border-slate-200 p-2.5 text-xs">
                  <div className="font-semibold text-slate-600">{c.category}</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="line-through text-slate-400">₹{c.originalINR}</span>
                    <ArrowRight className="w-3 h-3 text-indigo-500" />
                    <span>₹{c.optimizedINR}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{optResult.disclaimer}</p>
          </div>
        )}
      </div>

      {/* Two Columns: Expense Tracking & Splitting | Group Collaboration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Expense Tracker & Splitter */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              Expense Tracker & Group Splitting
            </h3>
          </div>

          <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <input
              type="text"
              placeholder="Expense title (e.g. Hotel Stay, Dinner)"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
            />
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
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
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
            />
            <input
              type="text"
              placeholder="Paid by (e.g. You, Aarav)"
              value={expPaidBy}
              onChange={(e) => setExpPaidBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
            />
            <select
              value={expSplitType}
              onChange={(e) => setExpSplitType(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
            >
              <option value="equal">Split Equally</option>
              <option value="custom">Split Custom Amounts</option>
              <option value="percentage">Split by Percentage (%)</option>
            </select>
            <input
              type="text"
              placeholder="Participants (comma-separated)"
              value={expParticipantsText}
              onChange={(e) => setExpParticipantsText(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
            />

            {expSplitType !== 'equal' && parsedParticipants.length > 0 && (
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {parsedParticipants.map((p) => (
                  <label key={p} className="text-[11px] text-slate-700 flex flex-col gap-1">
                    <span className="font-semibold">{p} ({expSplitType === 'percentage' ? '%' : '₹'})</span>
                    <input
                      type="number"
                      step="0.01"
                      value={expCustomValues[p] || ''}
                      onChange={(e) => setExpCustomValues((prev) => ({ ...prev, [p]: e.target.value }))}
                      className="px-2 py-1 rounded border border-slate-200 bg-white text-xs"
                    />
                  </label>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add & Split Expense
            </button>
          </form>

          {/* Category Breakdown */}
          {categoryTotals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryTotals.map((c) => (
                <span key={c.category} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-semibold">
                  {c.category}: ₹{c.total.toLocaleString()}
                </span>
              ))}
            </div>
          )}

          {/* Expense History */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No expenses logged yet.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{exp.title} <span className="text-[10px] font-semibold text-indigo-600 ml-1">({exp.category})</span></div>
                    <div className="text-[11px] text-slate-500">
                      Paid by <strong>{exp.paidByName}</strong> · {exp.splitType} split ({exp.splits.map((s) => `${s.memberName}: ₹${s.amount}`).join(', ')})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">₹{exp.amount.toLocaleString()}</span>
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Group Collaboration & Settlements */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Group Travellers & Permissions
              </h3>
              {shareCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Code: {shareCode}
                </button>
              )}
            </div>

            <form onSubmit={handleInviteMember} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Traveller Name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="submit" className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer">
                  Invite Member
                </button>
              </div>
            </form>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="Join trip via Share Code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs uppercase"
              />
              <button onClick={handleJoinByCode} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">
                Join
              </button>
            </div>

            {members.length > 0 && (
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <span className="text-slate-400 ml-1.5">{m.email}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Who Owes Whom & Settlements */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-extrabold text-slate-900">Outstanding Balances</h3>
            {debts.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl font-medium">
                All group expenses are settled!
              </p>
            ) : (
              <div className="space-y-2">
                {debts.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <div>
                      <strong>{d.from}</strong> owes <strong>{d.to}</strong>{' '}
                      <span className="font-bold text-amber-900">₹{d.amount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => handleSettleDebt(d)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer"
                    >
                      Settle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {settlements.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 mb-1">Settlement History</div>
                {settlements.slice(0, 4).map((s) => (
                  <div key={s.id} className="text-[11px] text-slate-600">
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

