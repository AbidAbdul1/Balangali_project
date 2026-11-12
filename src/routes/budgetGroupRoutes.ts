/**
 * Budget Management, AI Cost Optimizer, Currency Conversion,
 * Group Trip Collaboration & Expense Splitting Routes
 */
import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { optionalAuth, AuthenticatedRequest } from './authRoutes.ts';

export const budgetGroupRouter = Router();

// Cached exchange rates (INR base)
let rateCache: { base: string; rates: Record<string, number>; date: string; source: string; fetchedAt: number } = {
  base: 'INR',
  rates: { INR: 1, USD: 0.0119, EUR: 0.011, GBP: 0.0094, JPY: 1.82, AED: 0.0437, SGD: 0.016, THB: 0.41 },
  date: new Date().toISOString().split('T')[0],
  source: 'Baseline reference rates (offline fallback)',
  fetchedAt: 0,
};

export function computeSplits(
  amount: number,
  splitType: 'equal' | 'custom' | 'percentage',
  participants: Array<{ memberName: string; amount?: number; percentage?: number }>
): { valid: boolean; error?: string; splits: Array<{ memberName: string; amount: number; percentage?: number }> } {
  if (!participants || participants.length === 0) {
    return { valid: false, error: 'At least one participant is required.', splits: [] };
  }
  const totalCents = Math.round(amount * 100);
  if (totalCents <= 0) {
    return { valid: false, error: 'Expense amount must be greater than zero.', splits: [] };
  }

  if (splitType === 'equal') {
    const n = participants.length;
    const baseCents = Math.floor(totalCents / n);
    let remainder = totalCents - baseCents * n;
    const splits = participants.map((p) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      return {
        memberName: p.memberName.trim(),
        amount: Number(((baseCents + extra) / 100).toFixed(2)),
      };
    });
    return { valid: true, splits };
  }

  if (splitType === 'percentage') {
    const pctSum = participants.reduce((s, p) => s + Number(p.percentage || 0), 0);
    if (Math.abs(pctSum - 100) > 0.5) {
      return { valid: false, error: `Percentages must total 100% (currently ${pctSum.toFixed(1)}%).`, splits: [] };
    }
    let allocatedCents = 0;
    const splits = participants.map((p, idx) => {
      const pct = Number(p.percentage || 0);
      const cents = idx === participants.length - 1 ? totalCents - allocatedCents : Math.round((totalCents * pct) / 100);
      allocatedCents += cents;
      return {
        memberName: p.memberName.trim(),
        amount: Number((cents / 100).toFixed(2)),
        percentage: pct,
      };
    });
    return { valid: true, splits };
  }

  // custom
  const customSumCents = participants.reduce((s, p) => s + Math.round(Number(p.amount || 0) * 100), 0);
  if (Math.abs(customSumCents - totalCents) > 2) {
    return {
      valid: false,
      error: `Custom split amounts (${(customSumCents / 100).toFixed(2)}) must equal total (${amount.toFixed(2)}).`,
      splits: [],
    };
  }
  const splits = participants.map((p) => ({
    memberName: p.memberName.trim(),
    amount: Number(Number(p.amount || 0).toFixed(2)),
  }));
  return { valid: true, splits };
}

export function calculateBalances(
  expenses: Array<{ amount: number; currency: string; paidByName: string; splits: Array<{ memberName: string; amount: number }> }>,
  settlements: Array<{ fromName: string; toName: string; amount: number }>
): {
  totalExpenditure: number;
  memberNetBalances: Record<string, number>;
  debts: Array<{ from: string; to: string; amount: number; currency: string }>;
} {
  const net: Record<string, number> = {};
  let totalExpenditure = 0;
  let currency = 'INR';

  for (const exp of expenses) {
    currency = exp.currency || currency;
    totalExpenditure += exp.amount;
    net[exp.paidByName] = (net[exp.paidByName] || 0) + exp.amount;
    for (const sp of exp.splits) {
      net[sp.memberName] = (net[sp.memberName] || 0) - sp.amount;
    }
  }

  for (const st of settlements) {
    net[st.fromName] = (net[st.fromName] || 0) + st.amount;
    net[st.toName] = (net[st.toName] || 0) - st.amount;
  }

  const debtors: Array<{ name: string; amount: number }> = [];
  const creditors: Array<{ name: string; amount: number }> = [];

  for (const [name, val] of Object.entries(net)) {
    const rounded = Math.round(val * 100) / 100;
    net[name] = rounded;
    if (rounded < -0.01) debtors.push({ name, amount: -rounded });
    else if (rounded > 0.01) creditors.push({ name, amount: rounded });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Array<{ from: string; to: string; amount: number; currency: string }> = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0.01) {
      debts.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Number(pay.toFixed(2)),
        currency,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount <= 0.01) i++;
    if (creditors[j].amount <= 0.01) j++;
  }

  return {
    totalExpenditure: Number(totalExpenditure.toFixed(2)),
    memberNetBalances: net,
    debts,
  };
}

// Currency rates endpoint
budgetGroupRouter.get('/currency/rates', async (_req: Request, res: Response) => {
  const twelveHours = 12 * 60 * 60 * 1000;
  if (Date.now() - rateCache.fetchedAt > twelveHours) {
    try {
      const resp = await fetch('https://open.er-api.com/v6/latest/INR');
      if (resp.ok) {
        const data = await resp.json();
        if (data?.rates) {
          rateCache = {
            base: 'INR',
            rates: data.rates,
            date: new Date().toISOString().split('T')[0],
            source: 'ExchangeRate-API (open.er-api.com)',
            fetchedAt: Date.now(),
          };
        }
      }
    } catch {
      // Keep fallback rates silently
    }
  }

  return res.json({
    success: true,
    base: rateCache.base,
    rates: rateCache.rates,
    conversionDate: rateCache.date,
    source: rateCache.source,
  });
});

// AI Cost Optimizer
budgetGroupRouter.post('/budget/optimize', (req: Request, res: Response) => {
  const priority = String(req.body?.priority || 'balanced') as 'lowest-cost' | 'shortest-time' | 'best-comfort' | 'balanced';
  const durationDays = Math.max(1, Number(req.body?.tripDurationDays || 2));
  const travelersCount = Math.max(1, Number(req.body?.travelersCount || 1));
  const originalCost = Math.max(500, Number(req.body?.originalEstimatedCostINR || 4500));

  const multipliers: Record<string, { transport: number; stay: number; food: number; activities: number; summary: string }> = {
    'lowest-cost': {
      transport: 0.55,
      stay: 0.65,
      food: 0.72,
      activities: 0.85,
      summary: 'Prioritizes public transit/metros/shared autos, budget guesthouses, and local eateries to maximize savings.',
    },
    'shortest-time': {
      transport: 1.15,
      stay: 1.0,
      food: 0.95,
      activities: 1.0,
      summary: 'Uses direct cabs/express trains and central stays near key sights to cut transit time by ~35%.',
    },
    'best-comfort': {
      transport: 1.35,
      stay: 1.45,
      food: 1.25,
      activities: 1.1,
      summary: 'Upgrades to private AC transfers, 4-star+ central hotels, and curated dining experiences.',
    },
    balanced: {
      transport: 0.82,
      stay: 0.88,
      food: 0.9,
      activities: 0.95,
      summary: 'Balances express transit with walkable clusters and mid-range boutique stays for best value.',
    },
  };

  const cfg = multipliers[priority] || multipliers.balanced;
  const baseTransport = originalCost * 0.25;
  const baseStay = originalCost * 0.35;
  const baseFood = originalCost * 0.25;
  const baseActivities = originalCost * 0.15;

  const optTransport = Math.round(baseTransport * cfg.transport);
  const optStay = Math.round(baseStay * cfg.stay);
  const optFood = Math.round(baseFood * cfg.food);
  const optActivities = Math.round(baseActivities * cfg.activities);
  const optimizedCost = optTransport + optStay + optFood + optActivities;

  return res.json({
    success: true,
    isEstimate: true,
    disclaimer: 'Estimated optimization based on category benchmarks; verify live ticket and hotel prices before booking.',
    priority,
    originalEstimatedCostINR: Math.round(originalCost),
    optimizedEstimatedCostINR: optimizedCost,
    potentialSavingsINR: Math.round(originalCost - optimizedCost),
    dailyBudgetINR: Math.round(optimizedCost / durationDays),
    perPersonCostINR: Math.round(optimizedCost / travelersCount),
    summary: cfg.summary,
    categoryChanges: [
      { category: 'Transport & Transfers', originalINR: Math.round(baseTransport), optimizedINR: optTransport },
      { category: 'Hotels & Stay', originalINR: Math.round(baseStay), optimizedINR: optStay },
      { category: 'Food & Dining', originalINR: Math.round(baseFood), optimizedINR: optFood },
      { category: 'Attractions & Activities', originalINR: Math.round(baseActivities), optimizedINR: optActivities },
    ],
  });
});

// Expenses CRUD
budgetGroupRouter.get('/trips/:tripId/expenses', (req: Request, res: Response) => {
  const { tripId } = req.params;
  const rows = db.prepare('SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC').all(tripId) as any[];
  const expenses = rows.map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    title: r.title,
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    paidByName: r.paid_by_name,
    splitType: r.split_type,
    splits: JSON.parse(r.splits_json || '[]'),
    notes: r.notes,
    createdAt: r.created_at,
  }));
  return res.json({ success: true, expenses });
});

budgetGroupRouter.post('/trips/:tripId/expenses', (req: Request, res: Response) => {
  const { tripId } = req.params;
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || 'Other');
  const amount = Number(req.body?.amount || 0);
  const currency = String(req.body?.currency || 'INR');
  const paidByName = String(req.body?.paidByName || '').trim();
  const splitType = (req.body?.splitType || 'equal') as 'equal' | 'custom' | 'percentage';
  const participants = Array.isArray(req.body?.participants) ? req.body.participants : [{ memberName: paidByName || 'You' }];
  const notes = String(req.body?.notes || '');

  if (!title || !paidByName || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Title, payer name, and positive amount are required.' });
  }

  const splitResult = computeSplits(amount, splitType, participants);
  if (!splitResult.valid) {
    return res.status(400).json({ success: false, error: splitResult.error });
  }

  const id = `exp_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO expenses (id, trip_id, title, category, amount, currency, paid_by_name, split_type, splits_json, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tripId, title, category, amount, currency, paidByName, splitType, JSON.stringify(splitResult.splits), notes, createdAt);

  return res.status(201).json({
    success: true,
    expense: {
      id,
      tripId,
      title,
      category,
      amount,
      currency,
      paidByName,
      splitType,
      splits: splitResult.splits,
      notes,
      createdAt,
    },
  });
});

budgetGroupRouter.delete('/trips/:tripId/expenses/:expenseId', (req: Request, res: Response) => {
  const { tripId, expenseId } = req.params;
  db.prepare('DELETE FROM expenses WHERE id = ? AND trip_id = ?').run(expenseId, tripId);
  return res.json({ success: true });
});

// Group Balances & Settlements
budgetGroupRouter.get('/trips/:tripId/balances', (req: Request, res: Response) => {
  const { tripId } = req.params;
  const expRows = db.prepare('SELECT * FROM expenses WHERE trip_id = ?').all(tripId) as any[];
  const setRows = db.prepare('SELECT * FROM settlements WHERE trip_id = ? ORDER BY settled_at DESC').all(tripId) as any[];

  const expenses = expRows.map((r) => ({
    amount: r.amount,
    currency: r.currency,
    paidByName: r.paid_by_name,
    splits: JSON.parse(r.splits_json || '[]'),
  }));
  const settlements = setRows.map((s) => ({
    id: s.id,
    tripId: s.trip_id,
    fromName: s.from_name,
    toName: s.to_name,
    amount: s.amount,
    currency: s.currency,
    settledAt: s.settled_at,
  }));

  const balances = calculateBalances(expenses, settlements);
  return res.json({ success: true, ...balances, settlements });
});

budgetGroupRouter.post('/trips/:tripId/settlements', (req: Request, res: Response) => {
  const { tripId } = req.params;
  const fromName = String(req.body?.fromName || '').trim();
  const toName = String(req.body?.toName || '').trim();
  const amount = Number(req.body?.amount || 0);
  const currency = String(req.body?.currency || 'INR');

  if (!fromName || !toName || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'fromName, toName, and positive amount are required.' });
  }

  const id = `stl_${crypto.randomUUID()}`;
  const settledAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO settlements (id, trip_id, from_name, to_name, amount, currency, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tripId, fromName, toName, amount, currency, settledAt);

  return res.status(201).json({
    success: true,
    settlement: { id, tripId, fromName, toName, amount, currency, settledAt },
  });
});

// Group Trip Members & Sharing
budgetGroupRouter.get('/trips/:tripId/members', (req: Request, res: Response) => {
  const { tripId } = req.params;
  const members = db.prepare('SELECT * FROM trip_members WHERE trip_id = ? ORDER BY invited_at ASC').all(tripId) as any[];
  const tripRow = db.prepare('SELECT share_code, is_shared FROM trips WHERE id = ?').get(tripId) as any;
  return res.json({
    success: true,
    shareCode: tripRow?.share_code || null,
    isShared: Boolean(tripRow?.is_shared),
    members: members.map((m) => ({
      id: m.id,
      tripId: m.trip_id,
      userId: m.user_id,
      email: m.email,
      name: m.name,
      role: m.role,
      invitedAt: m.invited_at,
    })),
  });
});

budgetGroupRouter.post('/trips/:tripId/members', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { tripId } = req.params;
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = ['owner', 'editor', 'viewer'].includes(req.body?.role) ? req.body.role : 'editor';

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Member name and email are required.' });
  }

  const id = `mem_${crypto.randomUUID()}`;
  const invitedAt = new Date().toISOString();
  try {
    db.prepare(
      'INSERT INTO trip_members (id, trip_id, user_id, email, name, role, invited_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tripId, null, email, name, role, invitedAt);
  } catch {
    db.prepare('UPDATE trip_members SET name = ?, role = ? WHERE trip_id = ? AND email = ?').run(name, role, tripId, email);
  }

  // Ensure trip has a share code
  const trip = db.prepare('SELECT id, share_code FROM trips WHERE id = ?').get(tripId) as any;
  let shareCode = trip?.share_code;
  if (trip && !shareCode) {
    shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    db.prepare('UPDATE trips SET is_shared = 1, share_code = ? WHERE id = ?').run(shareCode, tripId);
  }

  return res.status(201).json({
    success: true,
    shareCode,
    member: { id, tripId, email, name, role, invitedAt },
  });
});

budgetGroupRouter.patch('/trips/:tripId/members/:memberId', (req: Request, res: Response) => {
  const { tripId, memberId } = req.params;
  const role = req.body?.role;
  if (!['owner', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Role must be owner, editor, or viewer.' });
  }
  db.prepare('UPDATE trip_members SET role = ? WHERE id = ? AND trip_id = ?').run(role, memberId, tripId);
  return res.json({ success: true });
});

budgetGroupRouter.delete('/trips/:tripId/members/:memberId', (req: Request, res: Response) => {
  const { tripId, memberId } = req.params;
  db.prepare('DELETE FROM trip_members WHERE id = ? AND trip_id = ?').run(memberId, tripId);
  return res.json({ success: true });
});

budgetGroupRouter.post('/trips/join/:shareCode', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const shareCode = String(req.params.shareCode || '').trim().toUpperCase();
  const trip = db.prepare('SELECT * FROM trips WHERE share_code = ?').get(shareCode) as any;
  if (!trip) {
    return res.status(404).json({ success: false, error: 'Invalid or expired trip share code.' });
  }

  const memberName = req.user?.name || String(req.body?.name || 'Guest Traveller').trim();
  const memberEmail = req.user?.email || String(req.body?.email || `guest-${Date.now()}@travelmate.local`).trim().toLowerCase();

  try {
    db.prepare(
      'INSERT INTO trip_members (id, trip_id, user_id, email, name, role, invited_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(`mem_${crypto.randomUUID()}`, trip.id, req.user?.id || null, memberEmail, memberName, 'editor', new Date().toISOString());
  } catch {
    // Already a member
  }

  return res.json({
    success: true,
    trip: JSON.parse(trip.trip_json),
  });
});

