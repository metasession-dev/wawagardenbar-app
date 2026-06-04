/**
 * @requirement REQ-066 — Regression guards for the 6 removed premature
 * inventory-deduction call sites.
 *
 * AC2: The historical pattern of calling `InventoryService.deductStock
 * ForOrder` from order-create / payment-confirm / tab-close paths
 * regressed inventory correctness because completion is owned by the
 * kitchen-display. These guards assert each previously-offending file
 * has no remaining `deductStockForOrder` call in its body.
 *
 * If a future change re-introduces an inline deduction call at any of
 * these sites, this test fails loudly — the operator's stated rule
 * ("nothing bypasses the kitchen display") would otherwise rot.
 *
 * Source-code assertion is the right shape here: the alternative
 * (mocking every dep of e.g. `OrderService.createOrder` to exercise it
 * end-to-end just to assert one mock was NOT called) buys little
 * relative to a one-line grep.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface RegressionGuard {
  file: string;
  description: string;
  /** Number of `deductStockForOrder(` calls allowed in this file. */
  allowedCalls: number;
  /** Historical lines that used to call. Reference only. */
  historicalLines: string;
}

const GUARDED_FILES: RegressionGuard[] = [
  {
    file: 'services/order-service.ts',
    description:
      'OrderService.createOrder + completeOrderPaymentManually used to deduct prematurely; ONE call remains inside the canonical `completeOrder` chokepoint (REQ-066 AC1)',
    allowedCalls: 1,
    historicalLines: '205-218 + 754-763',
  },
  {
    file: 'app/api/webhooks/paystack/route.ts',
    description: 'Paystack webhook used to deduct at payment-confirmed',
    allowedCalls: 0,
    historicalLines: '122-136',
  },
  {
    file: 'app/api/webhooks/monnify/route.ts',
    description: 'Monnify webhook used to deduct at payment-confirmed',
    allowedCalls: 0,
    historicalLines: '131-135',
  },
  {
    file: 'services/tab-service.ts',
    description:
      'TabService had deductions at tab-open + tab-close; tab orders go through kitchen-display individually',
    allowedCalls: 0,
    historicalLines: '358-369 + 845-852',
  },
];

describe('REQ-066 AC2 — premature inventory-deduction call sites stay removed', () => {
  it.each(GUARDED_FILES)(
    '$file has exactly $allowedCalls deductStockForOrder( call(s) ($description)',
    ({ file, allowedCalls }) => {
      const fullPath = path.join(process.cwd(), file);
      const source = fs.readFileSync(fullPath, 'utf8');
      const matches = source.match(/deductStockForOrder\s*\(/g) ?? [];
      expect(matches).toHaveLength(allowedCalls);
    }
  );
});
