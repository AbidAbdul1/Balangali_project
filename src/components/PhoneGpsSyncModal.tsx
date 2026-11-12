import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Satellite, Check, Copy, RefreshCw, X, ShieldCheck, ArrowRight, Wifi } from 'lucide-react';

interface GpsSyncSessionData {
  sessionId: string;
  syncUrl: string;
  qrCodeDataUrl?: string;
  status?: string;
  location?: {
    name: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  coords?: {
    name: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    accuracyMeters?: number;
    timestamp?: string;
  };
}

async function createGpsSyncSession(): Promise<GpsSyncSessionData | null> {
  try {
    const res = await fetch('/api/gps-sync/session', { method: 'POST' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function pollGpsSyncSession(sessionId: string): Promise<GpsSyncSessionData | null> {
  try {
    const res = await fetch(`/api/gps-sync/${sessionId}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

interface PhoneGpsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSynced: (location: {
    name: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    source: 'phone-gps-sync';
  }) => void;
}

export const PhoneGpsSyncModal: React.FC<PhoneGpsSyncModalProps> = ({
  isOpen,
  onClose,
  onLocationSynced,
}) => {
  const [sessionData, setSessionData] = useState<GpsSyncSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'listening' | 'received' | 'error'>('listening');
  const [syncedResult, setSyncedResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Initialize GPS Sync session
  const startSession = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSyncStatus('listening');
    setSyncedResult(null);

    const data = await createGpsSyncSession();
    if (data) {
      setSessionData(data);
    } else {
      setErrorMsg('Could not establish GPS sync session. Please verify backend is running.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen]);

  // Start polling when sessionData is ready
  useEffect(() => {
    if (!isOpen || !sessionData?.sessionId || syncStatus === 'received') return;

    pollIntervalRef.current = setInterval(async () => {
      const pollRes = await pollGpsSyncSession(sessionData.sessionId);
      if (pollRes && pollRes.status === 'ready' && pollRes.coords) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        const coords = pollRes.coords;
        setSyncStatus('received');
        setSyncedResult(coords);

        // Notify parent after brief confirmation
        setTimeout(() => {
          onLocationSynced({
            name: coords.name,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: coords.accuracy ?? coords.accuracyMeters,
            source: 'phone-gps-sync',
          });
          onClose();
        }, 1600);
      }
    }, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, sessionData, syncStatus]);

  const copySyncLink = () => {
    if (!sessionData?.syncUrl) return;
    navigator.clipboard.writeText(sessionData.syncUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 border border-white/15">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Hotspot Satellite GPS Sync</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Hotspot Mode
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Beam exact satellite coordinates from your hotspot phone to your laptop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-sm font-semibold text-slate-600">Generating secure GPS relay session...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <p className="font-bold">⚠️ Connection Issue</p>
              <p>{errorMsg}</p>
              <button
                onClick={startSession}
                className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          ) : syncStatus === 'received' && syncedResult ? (
            /* Success State */
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-emerald-500 shadow-md animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900">🛰️ Exact Satellite GPS Locked!</h4>
              <p className="text-sm font-bold text-emerald-700 max-w-sm">
                {syncedResult.name}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span>Lat: {syncedResult.latitude?.toFixed(4)}°</span>
                <span>•</span>
                <span>Lon: {syncedResult.longitude?.toFixed(4)}°</span>
                {syncedResult.accuracy && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">±{Math.round(syncedResult.accuracy)}m</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">Applying location to your itinerary and map now...</p>
            </div>
          ) : (
            /* Active Sync QR & PIN Display */
            <>
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                {/* QR Code Container */}
                <div className="shrink-0 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center">
                  {sessionData?.syncUrl ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(sessionData.syncUrl)}`}
                      alt="Scan to sync GPS"
                      className="w-40 h-40 rounded-lg mx-auto block"
                      onError={(e) => {
                        // Fallback styling if offline
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="mt-2 text-[11px] font-mono font-bold text-slate-600">
                    PIN: <span className="text-indigo-600">{sessionData?.sessionId}</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <p>
                      <strong>Scan with your Phone</strong> (the device providing this mobile hotspot) using the camera or QR scanner.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <p>
                      Tap <strong>"Allow Location"</strong> on your phone. Your phone's real satellite GPS chip locks onto satellites.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <p>
                      Your laptop automatically receives the coordinates (accurate to <strong>3-5 meters</strong>) and centers your trip!
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={copySyncLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{isCopied ? 'Link Copied to Clipboard!' : 'Copy Mobile Sync Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Radar Listening Indicator */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div className="text-xs text-emerald-900 font-medium flex-1">
                  <span>Listening for phone GPS signal across hotspot...</span>
                  <span className="block text-[11px] text-emerald-700/80">
                    Keep this modal open while scanning on your phone.
                  </span>
                </div>
                <button
                  onClick={startSession}
                  title="Generate a new session PIN"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Hotspot & Wi-Fi Technical Explanation Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-600" />
              <span>Why Hotspot Sync is Needed for Exact Precision:</span>
            </div>
            <p className="leading-snug">
              Cellular hotspots assign IP addresses from telecom gateway centers (e.g. Jio/Airtel switching hubs in Mumbai or Delhi). Connecting your phone's satellite GPS bypasses cellular IP routing and locks your exact street position in seconds.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-End Local Hotspot Relay</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

