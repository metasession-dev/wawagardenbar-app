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
  closingPosition: number;
}
