import React, { useState, useEffect } from 'react';
import { ItineraryPlan, TravelDocument, ReminderItem } from '../types/travel';
import {
  saveTripOffline,
  getOfflineTrips,
  removeOfflineTrip,
  flushOfflineSyncQueue,
  OfflineTripRecord,
} from '../utils/offlineStorage';
import {
  Shield,
  FileText,
  Download,
  Trash2,
  Upload,
  WifiOff,
  Wifi,
  Bell,
  PhoneCall,
  Languages,
  ExternalLink,
  LogOut,
  UserCheck,
  Check,
  Plus,
} from 'lucide-react';

interface TravelVaultPanelProps {
  itinerary: ItineraryPlan | null;
  destinationCountryHint?: string;
  onLoadOfflineTrip: (trip: ItineraryPlan) => void;
  onNotify: (msg: string) => void;
}

export const TravelVaultPanel: React.FC<TravelVaultPanelProps> = ({
  itinerary,
  destinationCountryHint = 'India',
  onLoadOfflineTrip,
  onNotify,
}) => {
  // Auth state
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<TravelDocument['docType']>('ticket');
  const [docRef, setDocRef] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  // Offline & Reminders & Country info
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineTrips, setOfflineTrips] = useState<OfflineTripRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [countryInfo, setCountryInfo] = useState<any>(null);
  const [countryQuery, setCountryQuery] = useState(destinationCountryHint);

  const loadSessionAndData = async () => {
    try {
      const [meRes, gRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/auth/google/status')]);
      if (gRes.ok) {
        const g = await gRes.json();
        setGoogleOAuthEnabled(Boolean(g.enabled));
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me.user || null);
        if (me.user) {
          const docRes = await fetch('/api/documents');
          if (docRes.ok) {
            const d = await docRes.json();
            setDocuments(d.documents || []);
          }
        } else {
          setDocuments([]);
        }
      }
      const remRes = await fetch('/api/reminders');
      if (remRes.ok) {
        const r = await remRes.json();
        setReminders(r.reminders || []);
      }
    } catch {
      // Offline mode
    }
    const off = await getOfflineTrips();
    setOfflineTrips(off);
  };

  const loadCountryInfo = async (country: string) => {
    try {
      const res = await fetch(`/api/travel-info/country?country=${encodeURIComponent(country)}`);
      if (res.ok) {
        const d = await res.json();
        setCountryInfo(d);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    loadSessionAndData();
    loadCountryInfo(countryQuery);

    const onOnline = async () => {
      setIsOnline(true);
      const synced = await flushOfflineSyncQueue();
      if (synced > 0) onNotify(`Synced ${synced} offline trip update(s) back to server.`);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'reset') {
      if (!resetTokenInput) {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput }),
        });
        const d = await res.json();
        if (d.resetToken) {
          setResetTokenInput(d.resetToken);
          onNotify('Reset token generated. Enter your new password to complete reset.');
        } else {
          onNotify(d.message || 'Check your email for reset instructions.');
        }
      } else {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetTokenInput, newPassword: passwordInput }),
        });
        const d = await res.json();
        if (res.ok) {
          onNotify('Password reset complete! Please sign in.');
          setAuthMode('login');
          setResetTokenInput('');
        } else {
          onNotify(d.error?.message || 'Reset failed.');
        }
      }
      return;
    }

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput, email: emailInput, password: passwordInput }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      setUser(d.user);
      setPasswordInput('');
      onNotify(`Signed in as ${d.user.name}`);
      loadSessionAndData();
    } else {
      onNotify(d.error?.message || 'Authentication failed.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setDocuments([]);
    onNotify('Signed out.');
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    let contentBase64 = '';
    let fileName = '';
    let mimeType = 'text/plain';

    if (docFile) {
      fileName = docFile.name;
      mimeType = docFile.type || 'application/pdf';
      contentBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.readAsDataURL(docFile);
      });
    }

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: itinerary?.id,
        title: docTitle.trim(),
        docType,
        referenceNumber: docRef.trim(),
        fileName,
        mimeType,
        contentBase64,
        notes: docNotes.trim(),
      }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      setDocTitle('');
      setDocRef('');
      setDocNotes('');
      setDocFile(null);
      onNotify(`Saved private document "${d.document.title}".`);
      loadSessionAndData();
    } else {
      onNotify(d.error || 'Could not save document.');
    }
  };

  const handleDownloadOffline = async () => {
    if (!itinerary) return;
    await saveTripOffline(itinerary, {
      emergencyContacts: countryInfo?.info?.emergency
        ? `Police: ${countryInfo.info.emergency.police}, Ambulance: ${countryInfo.info.emergency.ambulance}`
        : undefined,
    });
    const off = await getOfflineTrips();
    setOfflineTrips(off);
    onNotify(`Saved "${itinerary.title}" to offline IndexedDB vault.`);
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: itinerary?.id, title: reminderTitle.trim(), dueDate: reminderDate }),
    });
    if (res.ok) {
      setReminderTitle('');
      setReminderDate('');
      loadSessionAndData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Connectivity & Offline Sync Midnight Hero Banner */}
      <div className="rounded-3xl bg-hero-midnight text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_36px_-10px_rgba(16,24,40,0.2)]">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isOnline ? 'bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'}`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#14B8A6] block">
              Travel Vault &amp; Offline Sync
            </span>
            <div className="font-display text-base sm:text-lg font-black text-white">
              {isOnline ? 'Online — Live Maps, Weather & Cloud Sync Active' : 'Offline Mode — Accessing Cached Itineraries'}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Store private travel documents, emergency contacts, and offline IndexedDB itineraries for zero-connectivity zones.
            </div>
          </div>
        </div>
        {itinerary && (
          <button
            onClick={handleDownloadOffline}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gradient text-white text-xs font-bold shadow-md cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" /> Save Current Trip Offline
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Account & Private Travel Documents */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Account & Private Travel Vault
              </h3>
              {user && (
                <button onClick={handleLogout} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              )}
            </div>

            {!user ? (
              <form onSubmit={handleAuthSubmit} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex gap-2 text-xs font-bold">
                  {(['login', 'register', 'reset'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setAuthMode(m)}
                      className={`px-3 py-1 rounded-lg cursor-pointer ${authMode === m ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      {m === 'login' ? 'Sign In' : m === 'register' ? 'Create Account' : 'Reset Password'}
                    </button>
                  ))}
                </div>

                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  required
                />
                {authMode === 'reset' && resetTokenInput && (
                  <input
                    type="text"
                    placeholder="Reset Token"
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                )}
                {(authMode !== 'reset' || resetTokenInput) && (
                  <input
                    type="password"
                    placeholder="Password (min 8 characters)"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    required
                  />
                )}
                <button type="submit" className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer">
                  {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Register' : resetTokenInput ? 'Set New Password' : 'Request Reset Token'}
                </button>
                {googleOAuthEnabled && authMode !== 'reset' && (
                  <a
                    href="/api/auth/google"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition"
                  >
                    <span>Continue with Google</span>
                  </a>
                )}
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-slate-500">{user.email}</div>
                  </div>
                </div>

                {/* Upload Document */}
                <form onSubmit={handleUploadDoc} className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Add Private Document / Booking Reference
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. Flight AI-102)"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      required
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="ticket">Ticket</option>
                      <option value="hotel">Hotel Confirmation</option>
                      <option value="itinerary">Itinerary</option>
                      <option value="visa">Visa / Entry</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="PNR / Booking Reference"
                      value={docRef}
                      onChange={(e) => setDocRef(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.json"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-white file:text-xs file:font-semibold"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Private notes (optional)"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                  <button type="submit" className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Save to Private Vault
                  </button>
                </form>

                {/* Document List */}
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{d.title} <span className="text-[10px] uppercase text-indigo-600">({d.docType})</span></div>
                        {d.referenceNumber && <div className="text-[11px] text-slate-500">Ref: {d.referenceNumber}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {d.fileName && (
                          <a href={`/api/documents/${d.id}/download`} className="text-indigo-600 font-semibold hover:underline">
                            Download
                          </a>
                        )}
                        <button
                          onClick={async () => {
                            await fetch(`/api/documents/${d.id}`, { method: 'DELETE' });
                            loadSessionAndData();
                          }}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Offline Saved Trips */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-extrabold text-slate-900">Offline Trips (IndexedDB)</h3>
            {offlineTrips.length === 0 ? (
              <p className="text-xs text-slate-500">No trips saved offline yet. Click "Save Current Trip Offline" above.</p>
            ) : (
              offlineTrips.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{t.title}</div>
                    <div className="text-[11px] text-slate-500">
                      Cached {new Date(t.downloadedAt).toLocaleString()} · {t.days.length} day(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onLoadOfflineTrip(t)} className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer">
                      Open
                    </button>
                    <button
                      onClick={async () => {
                        await removeOfflineTrip(t.id);
                        setOfflineTrips(await getOfflineTrips());
                      }}
                      className="text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Smart Travel Tools: Reminders, Emergency, Visa Links, Local Phrases */}
        <div className="lg:col-span-6 space-y-6">
          {/* Travel Reminders */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Travel Reminders
            </h3>
            <form onSubmit={handleAddReminder} className="flex gap-2">
              <input
                type="text"
                placeholder="Reminder (e.g. Web check-in, Carry passport)"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <div className="space-y-1.5">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                  <button
                    onClick={async () => {
                      await fetch(`/api/reminders/${r.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completed: !r.completed }),
                      });
                      loadSessionAndData();
                    }}
                    className="flex items-center gap-2 text-left cursor-pointer"
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center border ${r.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {r.completed && <Check className="w-3 h-3" />}
                    </span>
                    <span className={r.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                      {r.title} {r.dueDate && <span className="text-slate-400">({r.dueDate})</span>}
                    </span>
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/reminders/${r.id}`, { method: 'DELETE' });
                      loadSessionAndData();
                    }}
                    className="text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency, Official Visa Portal & Local Phrases */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-rose-600" />
                Emergency, Visa & Local Phrases
              </h3>
              <select
                value={countryQuery}
                onChange={(e) => {
                  setCountryQuery(e.target.value);
                  loadCountryInfo(e.target.value);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                <option value="india">India</option>
                <option value="france">France</option>
                <option value="japan">Japan</option>
                <option value="italy">Italy</option>
              </select>
            </div>

            {countryInfo?.info && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Police</div>
                    <div className="text-base font-extrabold text-slate-900">{countryInfo.info.emergency.police}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Ambulance</div>
                    <div className="text-base font-extrabold text-slate-900">{countryInfo.info.emergency.ambulance}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Fire / Universal</div>
                    <div className="text-base font-extrabold text-slate-900">
                      {countryInfo.info.emergency.universal || countryInfo.info.emergency.fire}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
                  <div className="font-bold text-blue-900">Official Visa & Entry Portal ({countryInfo.info.country})</div>
                  <p className="text-[11px] text-blue-800">{countryInfo.info.visaNote}</p>
                  <a
                    href={countryInfo.info.visaPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                  >
                    Visit Official Government Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                    <Languages className="w-3.5 h-3.5 text-indigo-600" /> Local Language Phrases
                  </div>
                  <div className="space-y-1.5">
                    {countryInfo.info.phrases.map((p: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{p.english}</span>
                        <span className="text-right">
                          <span className="font-bold text-indigo-700">{p.local}</span>{' '}
                          <span className="text-[10px] text-slate-500">({p.pronunciation})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

