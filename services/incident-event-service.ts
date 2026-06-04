/**
 * @requirement REQ-066 — IncidentEventService
 *
 * Thin write/read surface around `IncidentEventModel`. Every catch site
 * that used to `console.error` and walk away now calls `recordIncident`.
 */
import { connectDB } from '@/lib/mongodb';
import IncidentEventModel, {
  type IIncidentEvent,
  type IncidentEventKind,
} from '@/models/incident-event-model';

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
}
