/**
 * @requirement REQ-106
 */
export interface CashPositionSummary {
  /** false when no CashPositionAdjustment entry exists at/before the opening cutoff. */
  seeded: boolean;
  openingPosition: number;
  cashIn: number;
  cashOutExpenses: number;
  cashOutDeposits: number;
  /** Seed/correction entries whose effectiveDate falls within this period — not yet folded into openingPosition. */
  adjustments: number;
  closingPosition: number;
}
