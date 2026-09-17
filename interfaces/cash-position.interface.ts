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

/**
 * @requirement REQ-106 (amended — AC10)
 * One itemizable movement composing the current position. Cash sales are
 * deliberately NOT itemized here (see CashPositionLedger.totalCashIn) —
 * per-transaction sale detail already belongs to the Daily/Range Report's
 * own revenue breakdown; this ledger exists to make the non-sales
 * movements (expenses/deposits/manual edits) individually verifiable.
 */
export interface CashPositionLedgerEntry {
  type: 'seed' | 'correction' | 'cash-out-expense' | 'cash-out-deposit';
  date: Date;
  /** Signed — positive increases the position, negative decreases it. */
  amount: number;
  description: string;
}

/**
 * @requirement REQ-106 (amended — AC10, paginated per iteration-3 amendment)
 * The live ("as of now") position plus every non-sales movement that
 * composes it, for the dedicated Cash Position page. `entries` is one page
 * of the full reverse-chronological list; `totalEntries`/`page`/`pageSize`
 * describe where that page sits within the whole.
 */
export interface CashPositionLedger {
  seeded: boolean;
  current: number;
  /** Total cash sales in since the opening balance was set — a single rolled-up figure, not itemized. */
  totalCashIn: number;
  entries: CashPositionLedgerEntry[];
  totalEntries: number;
  page: number;
  pageSize: number;
}
