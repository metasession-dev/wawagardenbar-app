'use client';

/**
 * @requirement REQ-077 — Expandable incidents
 * @requirement SRS REQ-INV-015 — Incident details panel: errorDetails + Order snapshot
 * @requirement SRS REQ-INV-016 — Stale-paid-order: status-history trail
 *
 * Renders the content of an expanded incident row. The panel layers
 * incident-level metadata (errorDetails JSON, timestamps, entityId
 * link) over the optional linked-Order snapshot (status, items,
 * totals, statusHistory). For `inventory_deduction_failed` rows whose
 * Order still has `inventoryDeducted: false`, the existing
 * `<IncidentRetryButton>` (REQ-066 AC10 / REQ-INV-013) is rendered
 * inline — passed through unchanged per R-003 mitigation.
 *
 * The panel is purely presentational: it never mutates props, never
 * performs network requests on render, and never interpolates input
 * into a DOM-injection sink (R-004 — the errorDetails JSON is
 * rendered as text via JSON.stringify + <pre>, never via
 * dangerouslySetInnerHTML).
 */
import Link from 'next/link';
import type { IncidentEventKind } from '@/models/incident-event-model';
import type {
  IncidentEventLean,
  IncidentLinkedOrderSnapshot,
} from '@/services/incident-event-service';
import { IncidentRetryButton } from '@/components/features/admin/incident-retry-button';

export interface IncidentDetailsPanelProps {
  incident: IncidentEventLean;
  linkedOrder: IncidentLinkedOrderSnapshot | null;
}

function formatNGN(amount?: number): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelative(when: Date | string | null | undefined): string {
  if (!when) return '—';
  const d = typeof when === 'string' ? new Date(when) : when;
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatISO(when: Date | string | null | undefined): string {
  if (!when) return '—';
  const d = typeof when === 'string' ? new Date(when) : when;
  return d.toISOString();
}

const ORDER_ENTITY_KINDS: IncidentEventKind[] = [
  'inventory_deduction_failed',
  'stale_paid_order',
];

export function IncidentDetailsPanel({
  incident,
  linkedOrder,
}: IncidentDetailsPanelProps) {
  const isOrderEntity = ORDER_ENTITY_KINDS.includes(incident.kind);
  const isRetryEligible =
    incident.kind === 'inventory_deduction_failed' &&
    linkedOrder !== null &&
    linkedOrder.inventoryDeducted === false;

  return (
    <div
      className="px-4 py-4 bg-muted/30 border-t border-border space-y-4"
      data-testid="incident-details-panel"
    >
      {/* Incident metadata */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Incident details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Created</div>
            <div className="font-mono">{formatISO(incident.createdAt)}</div>
            <div className="text-muted-foreground">
              ({formatRelative(incident.createdAt)})
            </div>
          </div>
          {incident.updatedAt &&
            String(incident.updatedAt) !== String(incident.createdAt) && (
              <div>
                <div className="text-muted-foreground">Updated</div>
                <div className="font-mono">{formatISO(incident.updatedAt)}</div>
                <div className="text-muted-foreground">
                  ({formatRelative(incident.updatedAt)})
                </div>
              </div>
            )}
          <div>
            <div className="text-muted-foreground">Entity ID</div>
            {isOrderEntity ? (
              <Link
                href={`/dashboard/orders/${incident.entityId}`}
                className="font-mono underline hover:no-underline"
              >
                {incident.entityId}
              </Link>
            ) : (
              <span className="font-mono">{incident.entityId}</span>
            )}
          </div>
        </div>

        {/* errorDetails JSON — rendered as text via <pre>, NEVER via
            dangerouslySetInnerHTML (R-004 mitigation). */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Error details
          </div>
          <pre className="text-xs bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
            {incident.errorDetails == null
              ? 'null'
              : JSON.stringify(incident.errorDetails, null, 2)}
          </pre>
        </div>
      </section>

      {/* Linked-Order snapshot */}
      {isOrderEntity && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Linked order</h3>
          {linkedOrder === null ? (
            <div className="text-xs text-muted-foreground italic">
              Linked order not found (may have been deleted).
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <div className="text-muted-foreground">Order #</div>
                  <div className="font-mono">{linkedOrder.orderNumber}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{linkedOrder.status}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Payment</div>
                  <div>
                    {linkedOrder.paymentStatus}
                    {linkedOrder.paymentMethod && (
                      <> · {linkedOrder.paymentMethod}</>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Inventory</div>
                  <div>
                    {linkedOrder.inventoryDeducted
                      ? '✓ Deducted'
                      : '✗ Not deducted'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-mono">
                    {formatNGN(linkedOrder.total)}
                  </div>
                </div>
                {!!linkedOrder.tipAmount && (
                  <div>
                    <div className="text-muted-foreground">Tip</div>
                    <div className="font-mono">
                      {formatNGN(linkedOrder.tipAmount)}
                    </div>
                  </div>
                )}
                {linkedOrder.businessDate && (
                  <div>
                    <div className="text-muted-foreground">Business date</div>
                    <div className="font-mono">
                      {new Date(linkedOrder.businessDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Paid at</div>
                  <div className="font-mono">
                    {formatISO(linkedOrder.paidAt)}
                  </div>
                </div>
              </div>

              {linkedOrder.items.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">Items</div>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {linkedOrder.items.map((it, i) => (
                      <li key={i}>
                        {it.name} × {it.quantity}
                        {it.total != null && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({formatNGN(it.total)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* REQ-INV-016 — Stale-paid-order status-history trail */}
              {incident.kind === 'stale_paid_order' &&
                linkedOrder.statusHistory.length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-1">
                      Status history
                    </div>
                    <ol className="space-y-1">
                      {linkedOrder.statusHistory.map((h, i) => (
                        <li
                          key={i}
                          className="flex gap-2 items-start"
                          data-testid="status-history-entry"
                        >
                          <span className="font-mono text-muted-foreground">
                            {formatISO(h.timestamp)}
                          </span>
                          <span className="font-medium">{h.status}</span>
                          {h.note && (
                            <span className="text-muted-foreground">
                              — {h.note}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
            </div>
          )}
        </section>
      )}

      {/* Retry-now action — REQ-INV-013 / REQ-066 AC10 reused as-is.
          R-003: component imported unchanged, same `orderId` prop. */}
      {isRetryEligible && (
        <section>
          <div className="text-xs text-muted-foreground mb-1">Remediation</div>
          <IncidentRetryButton orderId={incident.entityId} />
        </section>
      )}
    </div>
  );
}
