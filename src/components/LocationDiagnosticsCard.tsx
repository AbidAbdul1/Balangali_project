import React, { useState } from 'react';
import { LocationDiagnostics } from '../utils/locationService';
import {
  Compass,
  Radio,
  Wifi,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crosshair,
  RefreshCw,
} from 'lucide-react';

interface LocationDiagnosticsCardProps {
  diagnostics: LocationDiagnostics | null;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenMapPicker?: () => void;
}

export const LocationDiagnosticsCard: React.FC<LocationDiagnosticsCardProps> = ({
  diagnostics,
  onRefresh,
  isLoading,
  onOpenMapPicker,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!diagnostics) {
    return null;
  }

  const isHighAccuracy =
    diagnostics.accuracyQuality === 'exact' || diagnostics.accuracyQuality === 'high';
  const isCoarse =
    diagnostics.accuracyQuality === 'coarse' || diagnostics.accuracyQuality === 'approximate';

  const accuracyBadgeColor = isHighAccuracy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : diagnostics.accuracyQuality === 'moderate'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  const methodBadgeColor =
    diagnostics.detectionMethod === 'windows-location-service'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : diagnostics.detectionMethod === 'wifi-triangulation'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : diagnostics.detectionMethod === 'ip-geolocation-estimate'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden text-xs">
      {/* Compact Top Header */}
      <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className={`w-3.5 h-3.5 text-indigo-600 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="font-bold text-slate-800 text-[11px] truncate">
            {diagnostics.detectionMethodLabel}
          </span>
          <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md border font-semibold shrink-0 ${
            diagnostics.locationQuality === 'Precise'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : diagnostics.locationQuality === 'Approximate'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {diagnostics.locationQuality || 'Approximate'} · ±{diagnostics.accuracyMeters >= 1000
              ? `${Math.round(diagnostics.accuracyMeters / 1000)} km`
              : `${diagnostics.accuracyMeters} m`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 cursor-pointer disabled:opacity-40 transition-colors"
            title="Re-detect Location"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-2.5 space-y-2">
        {/* Coarse IP Alert Notice */}
        {isCoarse && (
          <div className="p-2 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block text-[11px]">Regional IP Estimate</span>
              <span className="text-slate-600 text-[10.5px]">
                {diagnostics.statusNote || 'Coordinates are estimated from your network gateway.'}
              </span>
              {onOpenMapPicker && (
                <button
                  type="button"
                  onClick={onOpenMapPicker}
                  className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3 text-indigo-600" />
                  <span>Pin Exact Spot on Map</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* High accuracy confirmation */}
        {isHighAccuracy && (
          <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-center gap-1.5 leading-snug">
            <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-700 text-[10.5px]">
              Sensor locked with street accuracy (±{diagnostics.accuracyMeters}m).
            </span>
          </div>
        )}

        {/* Essential Info Row */}
        <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
          <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Coords</span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {diagnostics.latitude.toFixed(4)}°, {diagnostics.longitude.toFixed(4)}°
            </span>
          </div>
          <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Connection</span>
            <span className="font-bold text-slate-800 text-[11px] truncate block">
              {diagnostics.connectionTypeLabel}
            </span>
          </div>
        </div>

        {/* Detailed Expanded View */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-600">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-500">Identified Place:</span>
              <span className="font-semibold text-slate-800 max-w-[190px] truncate text-right">
                {diagnostics.name}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-500">Method:</span>
              <span className={`px-1.5 py-0.2 rounded font-semibold border ${methodBadgeColor}`}>
                {diagnostics.detectionMethodLabel}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-500">Permission:</span>
              <span className="font-semibold text-slate-800 capitalize flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" />
                <span>{diagnostics.permissionStatus}</span>
              </span>
            </div>

            {diagnostics.ispName && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500">ISP / Carrier:</span>
                <span className="font-mono text-slate-700 max-w-[170px] truncate">
                  {diagnostics.ispName}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 text-slate-400 text-[9.5px]">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>Updated: {diagnostics.lastUpdated}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
