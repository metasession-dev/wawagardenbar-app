'use client';

/**
 * @requirement REQ-077 — Expandable incidents
 * @requirement SRS REQ-INV-014 — Incidents queue row expansion UX
 * @requirement SRS REQ-INV-017 — Incidents URL state: filter + expanded-row hash
 * @requirement Risk register R-004 — URL-hash fidelity + injection-surface defence
 *
 * Wraps each `/dashboard/incidents` table row so the operator can
 * expand it inline to reveal `<IncidentDetailsPanel>`. The wrapper
 * owns the expand/collapse state, the chevron affordance, and the
 * URL-hash sync that round-trips state across page reload.
 *
 * Hash-sync contract (REQ-INV-017):
 *   - On mount: parse `window.location.hash` for `open=<id>(,<id>)*`
 *     and validate each segment against `/^[a-f0-9]+$/` (R-004
 *     mitigation). Initial expansion state is the validated Set.
 *   - On toggle: update local Set + write the new hash back via
 *     `history.replaceState` (no navigation, no scroll jump).
 *   - The validated IDs drive `useState(initial)` for the
 *     expansion-state Set ONLY — never `dangerouslySetInnerHTML`,
 *     never `eval`. Per R-004 the regex is the boundary defence.
 *
 * The `parseExpandedFromHash` helper is exported for unit testing
 * (see `__tests__/components/incident-row.hash-parse.test.tsx`).
 */
import { useEffect, useRef, useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import type { IncidentEventKind } from '@/models/incident-event-model';
import type {
  IncidentEventLean,
  IncidentLinkedOrderSnapshot,
} from '@/services/incident-event-service';
import { IncidentDetailsPanel } from '@/components/features/admin/incident-details-panel';

const KIND_LABELS: Record<IncidentEventKind, string> = {
  inventory_deduction_failed: 'Inventory deduction failed',
  stale_paid_order: 'Stale paid order',
};

const KIND_VARIANTS: Record<
  IncidentEventKind,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  inventory_deduction_failed: 'destructive',
  stale_paid_order: 'secondary',
};

function timeSince(when: Date | string): string {
  const t =
    typeof when === 'string' ? new Date(when).getTime() : when.getTime();
  const ms = Date.now() - t;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * R-004 mitigation — validate each hash segment against ObjectId
 * pattern, silently discard non-matching. Exported for unit-test
 * coverage (the regex-validation contract is the load-bearing
 * boundary). Length not enforced — the regex enforces "no injection",
 * not "exact 24 chars"; length validation would only add
 * false-positive rejections without security benefit.
 */
export function parseExpandedFromHash(
  hash: string | null | undefined
): Set<string> {
  if (!hash) return new Set();
  // Strip leading `#`, then split on `&` to handle `#kind=cash&open=...`
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = stripped.split('&');
  const openParam = params.find((p) => p.startsWith('open='));
  if (!openParam) return new Set();
  const value = openParam.slice('open='.length);
  if (!value) return new Set();
  const segments = value.split(',');
  const valid: string[] = [];
  for (const s of segments) {
    if (s && /^[a-f0-9]+$/.test(s)) {
      valid.push(s);
    }
  }
  return new Set(valid);
}

function serialiseExpandedToHash(
  expanded: Set<string>,
  existingHash: string
): string {
  // Preserve any other `&`-separated hash params; only update `open=`.
  const stripped = existingHash.startsWith('#')
    ? existingHash.slice(1)
    : existingHash;
  const params = stripped ? stripped.split('&').filter(Boolean) : [];
  const without = params.filter((p) => !p.startsWith('open='));
  if (expanded.size > 0) {
    without.push(`open=${Array.from(expanded).join(',')}`);
  }
  return without.length === 0 ? '' : `#${without.join('&')}`;
}

export interface IncidentRowProps {
  incident: IncidentEventLean;
  linkedOrder: IncidentLinkedOrderSnapshot | null;
}

export function IncidentRow({ incident, linkedOrder }: IncidentRowProps) {
  const incidentId = String(incident._id);
  const [expanded, setExpanded] = useState(false);
  const initialised = useRef(false);

  // Mount-time: read the hash and decide whether THIS row is expanded.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const expandedSet = parseExpandedFromHash(window.location.hash);
    if (expandedSet.has(incidentId)) {
      setExpanded(true);
    }
  }, [incidentId]);

  // Toggle: also sync the hash so reload + share preserves state.
  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        const currentHash = window.location.hash;
        const currentExpanded = parseExpandedFromHash(currentHash);
        if (next) {
          currentExpanded.add(incidentId);
        } else {
          currentExpanded.delete(incidentId);
        }
        const newHash = serialiseExpandedToHash(currentExpanded, currentHash);
        const newUrl =
          window.location.pathname + window.location.search + newHash;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // history.replaceState can throw in some iframe sandboxes; we
        // don't fail the toggle — UX still works for the current page.
      }
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls={`incident-panel-${incidentId}`}
        data-testid={`incident-row-${incidentId}`}
      >
        <TableCell className="w-8">
          <ChevronRight
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </TableCell>
        <TableCell>
          <Badge variant={KIND_VARIANTS[incident.kind]}>
            {KIND_LABELS[incident.kind]}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-xs">{incident.entityId}</TableCell>
        <TableCell className="max-w-2xl text-sm">{incident.summary}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {timeSince(incident.createdAt)}
        </TableCell>
        <TableCell className="text-right">
          {/* The Action column collapsed-state hint: when the linked
              Order is already deducted, show ✓ Deducted so the
              operator doesn't need to expand to learn this. Retry is
              moved INTO the expansion panel for incidents that need
              it. */}
          {incident.kind === 'inventory_deduction_failed' &&
          linkedOrder !== null &&
          linkedOrder.inventoryDeducted === true ? (
            <span className="text-xs text-muted-foreground">✓ Deducted</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow data-testid={`incident-row-${incidentId}-expanded`}>
          <TableCell colSpan={6} className="p-0">
            <div id={`incident-panel-${incidentId}`}>
              <IncidentDetailsPanel
                incident={incident}
                linkedOrder={linkedOrder}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
