import React from 'react';

export interface FloatingQuickDockProps {
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
  onOpenPackingList?: () => void;
  onOpenExportSheet?: () => void;
  onOpenCurrency?: () => void;
  onOpenLanguage?: () => void;
  onOpenPacking?: () => void;
  onOpenVault?: () => void;
  onOpenBudget?: () => void;
  onOpenSavedTrips?: () => void;
  onExportPdf?: () => void;
  onOpenDiagnostics?: () => void;
  currency?: string;
  language?: string;
  [key: string]: unknown;
}

/**
 * Floating toolbar intentionally removed under the Natural Journey editorial redesign;
 * secondary utilities live cleanly inside the Navbar "More" menu.
 */
export const FloatingQuickDock: React.FC<FloatingQuickDockProps> = () => null;

export default FloatingQuickDock;
