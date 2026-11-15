import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import http from 'node:http';

// Use isolated temporary SQLite database for tests
const tempDbPath = path.join(os.tmpdir(), `travelmate-test-${Date.now()}.db`);
process.env.TRAVELMATE_DB_PATH = tempDbPath;

import { authRouter, hashPassword, verifyPassword } from '../src/routes/authRoutes.ts';
import { itineraryRouter } from '../src/routes/itineraryRoutes.ts';
import { budgetGroupRouter, computeSplits, calculateBalances } from '../src/routes/budgetGroupRoutes.ts';
import { companionDocsRouter } from '../src/routes/companionDocsRoutes.ts';
import { googleMapsRouter } from '../src/routes/googleMapsRoutes.ts';
import { ALL_REGIONS } from '../src/data/destinations.ts';
import { db } from '../src/db/database.ts';

let server: http.Server;
let baseUrl = '';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', googleMapsRouter);
  app.use('/api', authRouter);
  app.use('/api', itineraryRouter);
  app.use('/api', budgetGroupRouter);
  app.use('/api', companionDocsRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
  } catch {
    // ignore cleanup errors
  }
});

describe('1. Password Hashing & Authentication', () => {
  it('hashes and verifies passwords with scrypt timing-safe check', () => {
    const hash = hashPassword('MySecurePass123!');
    assert.ok(hash.includes(':'));
    assert.equal(verifyPassword('MySecurePass123!', hash), true);
    assert.equal(verifyPassword('WrongPass', hash), false);
  });

  it('registers, logs in, reads profile, and isolates private documents', async () => {
    const suffix = Date.now();
    const aliceEmail = `alice-${suffix}@example.com`;
    const bobEmail = `bob-${suffix}@example.com`;

    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: aliceEmail, password: 'Password123' }),
    });
    assert.equal(reg.status, 201);
    const regJson = await reg.json();
    assert.equal(regJson.success, true);
    const tokenA = regJson.token;

    // Duplicate email rejected
    const dup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice2', email: aliceEmail, password: 'Password123' }),
    });
    assert.equal(dup.status, 409);

    // Unauthenticated document access blocked
    const unauthDoc = await fetch(`${baseUrl}/api/documents`);
    assert.equal(unauthDoc.status, 401);

    // Authenticated document upload
    const docCreate = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ title: 'Paris Flight', docType: 'ticket', referenceNumber: 'AF123' }),
    });
    assert.equal(docCreate.status, 201);
    const docJson = await docCreate.json();

    // Register User B and verify User B cannot delete User A's document
    const regB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', email: bobEmail, password: 'Password123' }),
    });
    const tokenB = (await regB.json()).token;

    const delAttempt = await fetch(`${baseUrl}/api/documents/${docJson.document.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(delAttempt.status, 404);
  });
});

describe('2. Expense Splitting & Balance Simplification', () => {
  it('splits ₹6000 equally among 3 travellers -> ₹2000 each', () => {
    const res = computeSplits(6000, 'equal', [
      { memberName: 'Alice' },
      { memberName: 'Bob' },
      { memberName: 'Charlie' },
    ]);
    assert.equal(res.valid, true);
    assert.deepEqual(
      res.splits.map((s) => s.amount),
      [2000, 2000, 2000]
    );
  });

  it('handles odd rounding cleanly so sum equals total', () => {
    const res = computeSplits(100, 'equal', [
      { memberName: 'A' },
      { memberName: 'B' },
      { memberName: 'C' },
    ]);
    assert.equal(res.valid, true);
    const sum = res.splits.reduce((s, x) => s + x.amount, 0);
    assert.equal(Number(sum.toFixed(2)), 100);
  });

  it('validates percentage and custom splits', () => {
    const badPct = computeSplits(1000, 'percentage', [
      { memberName: 'A', percentage: 50 },
      { memberName: 'B', percentage: 30 },
    ]);
    assert.equal(badPct.valid, false);

    const goodPct = computeSplits(1000, 'percentage', [
      { memberName: 'A', percentage: 60 },
      { memberName: 'B', percentage: 40 },
    ]);
    assert.equal(goodPct.valid, true);
    assert.equal(goodPct.splits[0].amount, 600);
    assert.equal(goodPct.splits[1].amount, 400);
  });

  it('calculates simplified debts and settlements', () => {
    const bal = calculateBalances(
      [
        {
          amount: 6000,
          currency: 'INR',
          paidByName: 'Alice',
          splits: [
            { memberName: 'Alice', amount: 2000 },
            { memberName: 'Bob', amount: 2000 },
            { memberName: 'Charlie', amount: 2000 },
          ],
        },
      ],
      [{ fromName: 'Bob', toName: 'Alice', amount: 2000 }]
    );
    assert.equal(bal.totalExpenditure, 6000);
    assert.equal(bal.debts.length, 1);
    assert.equal(bal.debts[0].from, 'Charlie');
    assert.equal(bal.debts[0].to, 'Alice');
    assert.equal(bal.debts[0].amount, 2000);
  });

  it('manages 6-character Ludo-style room codes and multi-app member joining', async () => {
    const unsavedTripId = `trip-unsaved-${Date.now()}`;

    // 1. Fetching members for an unsaved trip auto-creates trip with 6-char room code
    const getRes = await fetch(`${baseUrl}/api/trips/${unsavedTripId}/members`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert.ok(typeof getData.shareCode === 'string');
    assert.equal(getData.shareCode.length, 6, 'Room code should be exactly 6 characters');
    const roomCode = getData.shareCode;

    // 2. Add companion with name alone (no email provided)
    const addRes1 = await fetch(`${baseUrl}/api/trips/${unsavedTripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Sharma', role: 'companion' }),
    });
    assert.equal(addRes1.status, 201);
    const addData1 = await addRes1.json();
    assert.equal(addData1.success, true);
    assert.equal(addData1.member.name, 'Rahul Sharma');
    assert.ok(addData1.member.email.includes('@room.local'));

    // 3. Add second companion with name alone (should not collide on email unique constraint)
    const addRes2 = await fetch(`${baseUrl}/api/trips/${unsavedTripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Priya Verma', role: 'companion' }),
    });
    assert.equal(addRes2.status, 201);
    const addData2 = await addRes2.json();
    assert.equal(addData2.success, true);
    assert.equal(addData2.member.name, 'Priya Verma');
    assert.notEqual(addData1.member.email, addData2.member.email);

    // 4. Join group via 6-character room code from another device/guest
    const joinRes = await fetch(`${baseUrl}/api/trips/join/${roomCode.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ananya Roy' }),
    });
    assert.equal(joinRes.status, 200);
    const joinData = await joinRes.json();
    assert.equal(joinData.success, true);
    assert.equal(joinData.tripId, unsavedTripId);
    assert.equal(joinData.shareCode, roomCode);
    const joinedNames = joinData.members.map((m: any) => m.name);
    assert.ok(joinedNames.includes('Rahul Sharma'));
    assert.ok(joinedNames.includes('Priya Verma'));
    assert.ok(joinedNames.includes('Ananya Roy'));
  });
});

describe('3. AI Cost Optimizer, Rescheduler & Route Optimizer', () => {
  const samplePlan = {
    id: 'trip-test-1',
    title: 'Test Trip',
    startingLocation: { name: 'Origin', latitude: 16.51, longitude: 80.62 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDestinations: 2,
    totalEstimatedBudgetINR: 1000,
    days: [
      {
        dayNumber: 1,
        date: 'Day 1',
        totalDistanceKm: 10,
        totalDurationMin: 180,
        items: [
          {
            id: 'it-1',
            order: 1,
            dayNumber: 1,
            timeSlot: '09:00 - 10:30',
            durationMin: 90,
            isConfirmed: true,
            destination: {
              id: 'd1',
              name: 'Confirmed Temple',
              category: 'Heritage & Temples',
              latitude: 16.515,
              longitude: 80.605,
              description: 'desc',
              shortDescription: 'short',
              rating: 4.8,
              reviewsCount: 1000,
              feeINR: 0,
              estimatedDurationMin: 90,
              bestTimeToVisit: 'Morning',
              openingHours: '6am-9pm',
              address: 'Hill',
              dataSource: 'test',
              isOutdoor: true,
              tags: ['temple'],
            },
          },
          {
            id: 'it-2',
            order: 2,
            dayNumber: 1,
            timeSlot: '11:00 - 12:30',
            durationMin: 90,
            isConfirmed: false,
            destination: {
              id: 'd2',
              name: 'River Park',
              category: 'Parks & Recreation',
              latitude: 16.505,
              longitude: 80.61,
              description: 'desc',
              shortDescription: 'short',
              rating: 4.5,
              reviewsCount: 500,
              feeINR: 50,
              estimatedDurationMin: 90,
              bestTimeToVisit: 'Evening',
              openingHours: '9am-6pm',
              address: 'River',
              dataSource: 'test',
              isOutdoor: true,
              tags: ['park'],
            },
          },
        ],
      },
    ],
  };

  it('preserves confirmed bookings during dynamic rescheduling', async () => {
    const res = await fetch(`${baseUrl}/api/itineraries/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: samplePlan,
        dayNumber: 1,
        scenario: 'arrived-late',
        delayMinutes: 120,
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.preview.preservedBookings.length, 1);
    assert.ok(data.preview.preservedBookings[0].includes('Confirmed Temple'));
    assert.equal(data.preview.proposedPlan.days[0].items[0].timeSlot, '09:00 - 10:30');
  });

  it('optimizes multi-stop route order', async () => {
    const res = await fetch(`${baseUrl}/api/routes/optimize-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 16.5, longitude: 80.6 },
        stops: [
          { itemId: 'far', latitude: 16.8, longitude: 80.9 },
          { itemId: 'near', latitude: 16.51, longitude: 80.61 },
        ],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.orderedStops[0].itemId, 'near');
  });

  it('computes budget optimization estimates', async () => {
    const res = await fetch(`${baseUrl}/api/budget/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priority: 'lowest-cost',
        tripDurationDays: 2,
        travelersCount: 2,
        originalEstimatedCostINR: 10000,
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.isEstimate, true);
    assert.ok(data.optimizedEstimatedCostINR < 10000);
  });
});

describe('4. Worldwide Regions & Official Country Info', () => {
  it('supports Paris, Tokyo, Rome, and Vijayawada', async () => {
    const names = ALL_REGIONS.map((r) => r.name.toLowerCase()).join(' ');
    for (const city of ['paris', 'tokyo', 'rome', 'vijayawada']) {
      assert.ok(names.includes(city), `Expected region for ${city}`);
    }

    for (const country of ['india', 'france', 'japan', 'italy']) {
      const res = await fetch(`${baseUrl}/api/travel-info/country?country=${country}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.info.visaPortalUrl.startsWith('https://'));
      assert.ok(data.info.emergency.police);
    }
  });
});

