import React from 'react';
import { LocationDiagnostics } from '../utils/locationService';

export interface LocationDiagnosticsCardProps {
  diagnostics?: LocationDiagnostics | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenMapPicker?: () => void;
  [key: string]: unknown;
}

/**
 * Diagnostics card intentionally suppressed from the user interface
 * to maintain a clean, minimal travel experience.
 * All location detection, Wi-Fi positioning, and IP fallback logic
 * remain 100% active in the background.
 */
export const LocationDiagnosticsCard: React.FC<LocationDiagnosticsCardProps> = () => null;

export default LocationDiagnosticsCard;
