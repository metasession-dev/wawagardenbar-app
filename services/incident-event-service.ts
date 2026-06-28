/**
 * @requirement REQ-066 — IncidentEventService
 * @requirement REQ-088 — Extended with new kinds + getUnresolvedSummary for daily cron
 *
 * Thin write/read surface around `IncidentEventModel`. Every catch site
 * that used to `console.error` and walk away now calls `recordIncident`.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import IncidentEventModel, {
  type IIncidentEvent,
  type IncidentEventKind,
} from '@/models/incident-event-model';
import OrderModel from '@/models/order-model';

export interface RecordIncidentInput {
  kind: IncidentEventKind;
  entityId: string;
  summary: string;
  errorDetails?: Record<string, unknown> | null;
}

export interface ListIncidentsFilter {
  kind?: IncidentEventKind | 'all';
  limit?: number;
  skip?: number;
}

export interface DedupRecentInput {
  kind: IncidentEventKind;
  entityId: string;
  withinHours: number;
}

/**
 * Snapshot of the Order linked by an incident's `entityId`. The
 * incidents page (REQ-077 / REQ-INV-015) renders this inline inside
 * each expanded row so admins can decide whether retry is safe without
 * navigating away. Projection is fixed — extending it requires
 * coordinated update in `listWithLinkedOrders`'s find call.
 */
export interface IncidentLinkedOrderSnapshot {
  _id: Types.ObjectId | string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  businessDate?: Date;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    total?: number;
  }>;
  total: number;
  tipAmount?: number;
  inventoryDeducted: boolean;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  paidAt?: Date;
  completedAt?: Date;
}

/**
 * `IIncidentEvent extends Document` carries Mongoose's instance
 * methods. The lean() path returns plain objects without those — pick
 * the fields the page consumes so TS doesn't demand `$assertPopulated`
 * etc on lean rows.
 */
export type IncidentEventLean = Pick<
  IIncidentEvent,
  'kind' | 'entityId' | 'summary' | 'errorDetails' | 'createdAt' | 'updatedAt'
> & { _id: unknown };

export interface IncidentWithLinkedOrder extends IncidentEventLean {
  linkedOrder: IncidentLinkedOrderSnapshot | null;
}

// Incident kinds whose `entityId` is an Order ObjectId. New kinds added
// in the future may not link to Orders; this list is the contract.
const ORDER_ENTITY_KINDS: ReadonlyArray<IncidentEventKind> = [
  'inventory_deduction_failed',
  'stale_paid_order',
  'points_award_failed',
  'reward_grant_failed',
];

export class IncidentEventService {
  static async recordIncident(
    input: RecordIncidentInput
  ): Promise<IIncidentEvent> {
    await connectDB();
    return IncidentEventModel.create({
      kind: input.kind,
      entityId: input.entityId,
      summary: input.summary,
      errorDetails: input.errorDetails ?? null,
    });
  }

  static async list(
    filter: ListIncidentsFilter = {}
  ): Promise<IIncidentEvent[]> {
    await connectDB();
    const query: Record<string, unknown> = {};
    if (filter.kind && filter.kind !== 'all') {
      query.kind = filter.kind;
    }
    const limit = filter.limit ?? 100;
    const skip = filter.skip ?? 0;
    return IncidentEventModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<IIncidentEvent[]>();
  }

  /**
   * REQ-077 / REQ-INV-015 — `/dashboard/incidents` join.
   *
   * Returns the same shape as `list()` but augments each row with a
   * snapshot of its linked Order (when `kind` is one of
   * `ORDER_ENTITY_KINDS` AND `entityId` is a valid ObjectId). Order
   * IDs are deduped across rows before the find, so a single tab
   * causing many incidents still fires one Order query. Rows whose
   * entity isn't an Order (future kinds) or whose ObjectId doesn't
   * resolve return `linkedOrder: null` — the page renders a "Linked
   * order not found" placeholder for the null case.
   *
   * The projection is fixed at the `IncidentLinkedOrderSnapshot`
   * shape — extending it requires coordinated update of both the type
   * and the find call below.
   */
  static async listWithLinkedOrders(
    filter: ListIncidentsFilter = {}
  ): Promise<IncidentWithLinkedOrder[]> {
    const events = await this.list(filter);
    if (events.length === 0) {
      return [];
    }

    const dedupOrderIds = Array.from(
      new Set(
        events
          .filter(
            (e) =>
              ORDER_ENTITY_KINDS.includes(e.kind) &&
              Types.ObjectId.isValid(e.entityId)
          )
          .map((e) => e.entityId)
      )
    );

    if (dedupOrderIds.length === 0) {
      return events.map((e) => ({ ...e, linkedOrder: null }));
    }

    await connectDB();
    const orders = await OrderModel.find(
      { _id: { $in: dedupOrderIds.map((id) => new Types.ObjectId(id)) } },
      {
        _id: 1,
        orderNumber: 1,
        status: 1,
        paymentStatus: 1,
        paymentMethod: 1,
        businessDate: 1,
        items: 1,
        total: 1,
        tipAmount: 1,
        inventoryDeducted: 1,
        statusHistory: 1,
        createdAt: 1,
        paidAt: 1,
        completedAt: 1,
      }
    ).lean<IncidentLinkedOrderSnapshot[]>();

    const ordersById = new Map<string, IncidentLinkedOrderSnapshot>(
      orders.map((o) => [String(o._id), o])
    );

    return events.map((e) => ({
      ...e,
      linkedOrder: ORDER_ENTITY_KINDS.includes(e.kind)
        ? (ordersById.get(e.entityId) ?? null)
        : null,
    }));
  }

  /**
   * Check whether a same-kind / same-entityId row exists within the
   * window. Used by the stale-paid-order scan so we don't log the same
   * order N times across N cron cycles.
   */
  static async dedupRecent(input: DedupRecentInput): Promise<boolean> {
    await connectDB();
    const since = new Date(Date.now() - input.withinHours * 60 * 60 * 1000);
    const found = await IncidentEventModel.findOne({
      kind: input.kind,
      entityId: input.entityId,
      createdAt: { $gte: since },
    }).lean<IIncidentEvent | null>();
    return found !== null;
  }

  /**
   * REQ-088 — Unresolved incident summary for the daily admin digest.
   *
   * Returns a grouped count by kind. "Unresolved" = no matching resolved
   * marker exists (the IncidentEvent schema does not have a `resolved`
   * boolean field yet; resolution is tracked by the absence of new
   * incidents for the same entity+kind within the dedup window). For
   * now, this returns all incidents created in the last 24h grouped by
   * kind — the daily summary cron uses this to decide whether to send.
   *
   * @returns `{ total: number, byKind: Array<{ kind: IncidentEventKind, count: number }> }`
   */
  static async getUnresolvedSummary(withinHours = 24): Promise<{
    total: number;
    byKind: Array<{ kind: IncidentEventKind; count: number }>;
  }> {
    await connectDB();
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const rows = await IncidentEventModel.aggregate<{
      _id: IncidentEventKind;
      count: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byKind = rows.map((r) => ({ kind: r._id, count: r.count }));
    const total = byKind.reduce((sum, r) => sum + r.count, 0);
    return { total, byKind };
  }
}
