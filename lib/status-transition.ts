/**
 * @requirement REQ-106
 * Generic pending → approved → transferred state-machine validator, shared
 * by PendingExpenseGroupService and CashDepositService (identical status
 * set, identical allowed transitions). Extracted so neither the schema's
 * shape nor the transition rule is duplicated.
 */
export type PendingApprovedTransferredStatus =
  | 'pending'
  | 'approved'
  | 'transferred';

export function validatePendingApprovedTransferredTransition(
  current: PendingApprovedTransferredStatus,
  next: PendingApprovedTransferredStatus
): void {
  const allowed: Record<
    PendingApprovedTransferredStatus,
    PendingApprovedTransferredStatus[]
  > = {
    pending: ['approved'],
    approved: ['transferred'],
    transferred: [],
  };
  if (!allowed[current].includes(next)) {
    throw new Error(
      `Invalid status transition: ${current} → ${next}. Allowed transitions from '${current}': [${allowed[current].join(', ') || 'none'}]`
    );
  }
}
