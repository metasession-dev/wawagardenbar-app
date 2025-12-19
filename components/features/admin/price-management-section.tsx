'use client';

import { useRef } from 'react';
import { PriceUpdateForm } from './price-update-form';
import { PriceHistoryViewer, PriceHistoryViewerRef } from './price-history-viewer';

interface PriceManagementSectionProps {
  menuItemId: string;
  currentPrice: number;
  currentCostPerUnit: number;
  menuItemName: string;
}

export function PriceManagementSection({
  menuItemId,
  currentPrice,
  currentCostPerUnit,
  menuItemName,
}: PriceManagementSectionProps) {
  const priceHistoryRef = useRef<PriceHistoryViewerRef>(null);

  function handlePriceUpdated() {
    // Refresh the price history when price is updated
    priceHistoryRef.current?.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Price Update Form */}
      <PriceUpdateForm
        menuItemId={menuItemId}
        currentPrice={currentPrice}
        currentCostPerUnit={currentCostPerUnit}
        menuItemName={menuItemName}
        onPriceUpdated={handlePriceUpdated}
      />

      {/* Price History Viewer */}
      <PriceHistoryViewer
        ref={priceHistoryRef}
        menuItemId={menuItemId}
        menuItemName={menuItemName}
      />
    </div>
  );
}
