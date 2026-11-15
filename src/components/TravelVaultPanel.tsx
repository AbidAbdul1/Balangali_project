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

export interface TravelVaultPanelProps {
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
    onNotify(`Saved "${itinerary.title}" to offline vault.`);
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
    <div className="space-y-8 py-2">
      {/* Editorial Header */}
      <div className="pb-6 border-b border-[#E6E2D8] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91A995]">
            Security &amp; Offline Readiness
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#343A36] mt-1">
            Travel Vault &amp; Offline Sync
          </h2>
          <p className="text-sm text-[#858B84] mt-1 max-w-2xl">
            Store private booking files, offline itineraries in IndexedDB, and emergency numbers for low-signal journeys.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-[#91A995]/20 text-[#243C32]' : 'bg-[#D68B65]/20 text-[#D68B65]'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </span>

          {itinerary && (
            <button
              type="button"
              onClick={handleDownloadOffline}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save trip offline</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Account & Documents */}
        <div className="lg:col-span-6 space-y-8">
          {/* Account Authentication */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#243C32]" />
              <span>Travel Account</span>
            </h3>

            {user ? (
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#243C32]" />
                    <span className="font-semibold text-[#343A36] text-sm">{user.name}</span>
                  </div>
                  <span className="text-xs text-[#858B84]">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E6E2D8] text-xs font-medium text-[#858B84] hover:text-[#343A36]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] space-y-3 text-xs">
                <div className="flex items-center gap-4 border-b border-[#E6E2D8] pb-2 text-xs">
                  {(['login', 'register', 'reset'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAuthMode(m)}
                      className={`capitalize pb-1 transition-colors ${
                        authMode === m ? 'font-semibold text-[#243C32] border-b-2 border-[#243C32]' : 'text-[#858B84]'
                      }`}
                    >
                      {m === 'reset' ? 'Reset password' : m}
                    </button>
                  ))}
                </div>

                {authMode === 'register' && (
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                  />
                )}

                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                />

                {authMode !== 'reset' && (
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                  />
                )}

                {authMode === 'reset' && resetTokenInput && (
                  <input
                    type="password"
                    required
                    placeholder="New password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                  />
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] font-medium transition-colors"
                >
                  {authMode === 'login' ? 'Sign in' : authMode === 'register' ? 'Create account' : resetTokenInput ? 'Update password' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>

          {/* Private Documents */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#243C32]" />
              <span>Private Documents</span>
            </h3>

            {user ? (
              <form onSubmit={handleUploadDoc} className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Document title (e.g. Flight Ticket, Passport copy, Hotel Voucher)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                  >
                    <option value="ticket">Ticket / Boarding Pass</option>
                    <option value="hotel">Hotel Confirmation</option>
                    <option value="visa">Visa / Travel Permit</option>
                    <option value="insurance">Travel Insurance</option>
                    <option value="other">Other Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reference / PNR number"
                    value={docRef}
                    onChange={(e) => setDocRef(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
                  />
                </div>
                <input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#858B84]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Save document</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-[#858B84] p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8]">
                Sign in above to securely store and view personal travel documents across devices.
              </p>
            )}

            {documents.length > 0 && (
              <div className="divide-y divide-[#E6E2D8] border-t border-b border-[#E6E2D8]">
                {documents.map((d) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#343A36]">{d.title}</span>
                      <span className="text-[#858B84] ml-2 font-mono uppercase text-[10px]">{d.docType}</span>
                      {d.referenceNumber && <span className="text-[#858B84] ml-2 font-mono">({d.referenceNumber})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/documents/${d.id}`, { method: 'DELETE' });
                        loadSessionAndData();
                      }}
                      className="text-[#858B84] hover:text-[#D68B65]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reminders, Offline Trips & Country Emergency */}
        <div className="lg:col-span-6 space-y-8">
          {/* Offline Trips in IndexedDB */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <Download className="w-5 h-5 text-[#243C32]" />
              <span>Offline Itineraries</span>
            </h3>

            {offlineTrips.length === 0 ? (
              <p className="text-xs text-[#858B84] p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8]">
                No offline trips cached yet. Click &ldquo;Save trip offline&rdquo; above to make your active schedule accessible without internet.
              </p>
            ) : (
              <div className="divide-y divide-[#E6E2D8] border-t border-b border-[#E6E2D8]">
                {offlineTrips.map((rec) => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#343A36]">{rec.title}</span>
                      <span className="text-[#858B84] ml-2">{rec.days?.length || 0} days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLoadOfflineTrip(rec)}
                        className="text-xs font-medium text-[#243C32] hover:underline"
                      >
                        Open offline
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeOfflineTrip(rec.id);
                          loadSessionAndData();
                        }}
                        className="text-[#858B84] hover:text-[#D68B65]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Travel Reminders */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#243C32]" />
              <span>Trip Reminders</span>
            </h3>

            <form onSubmit={handleAddReminder} className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] flex gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Reminder (e.g. Check in online, Pack sunscreen)"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
              />
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="px-2 py-2 rounded-xl bg-[#F7F5EF] border border-[#E6E2D8] text-[#343A36]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] font-medium"
              >
                Add
              </button>
            </form>

            {reminders.length > 0 && (
              <div className="divide-y divide-[#E6E2D8] border-t border-b border-[#E6E2D8]">
                {reminders.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/reminders/${r.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ completed: !r.completed }),
                        });
                        loadSessionAndData();
                      }}
                      className="inline-flex items-center gap-2 text-left"
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${r.completed ? 'bg-[#243C32] border-[#243C32] text-white' : 'border-[#D8D2C5]'}`}>
                        {r.completed && <Check className="w-3 h-3" />}
                      </span>
                      <span className={r.completed ? 'line-through text-[#858B84]' : 'text-[#343A36] font-medium'}>
                        {r.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/reminders/${r.id}`, { method: 'DELETE' });
                        loadSessionAndData();
                      }}
                      className="text-[#858B84] hover:text-[#D68B65]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency & Country Support Info */}
          {countryInfo?.info && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold text-[#343A36] flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-[#243C32]" />
                <span>Emergency &amp; Support ({countryInfo.info.country})</span>
              </h3>

              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E2D8] space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F7F5EF] space-y-0.5">
                    <span className="text-[10px] text-[#858B84] uppercase">Police</span>
                    <div className="font-bold text-[#343A36] text-sm">{countryInfo.info.emergency.police}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F5EF] space-y-0.5">
                    <span className="text-[10px] text-[#858B84] uppercase">Ambulance</span>
                    <div className="font-bold text-[#343A36] text-sm">{countryInfo.info.emergency.ambulance}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F5EF] space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#858B84] uppercase">Universal / Fire</span>
                    <div className="font-bold text-[#343A36] text-sm">
                      {countryInfo.info.emergency.universal || countryInfo.info.emergency.fire}
                    </div>
                  </div>
                </div>

                {countryInfo.info.visaPortalUrl && (
                  <div className="pt-2 border-t border-[#E6E2D8] flex items-center justify-between">
                    <div>
                      <span className="font-medium text-[#343A36]">Official Visa / Entry Portal</span>
                      <p className="text-[11px] text-[#858B84]">{countryInfo.info.visaNote}</p>
                    </div>
                    <a
                      href={countryInfo.info.visaPortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#243C32] font-medium hover:underline"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelVaultPanel;
