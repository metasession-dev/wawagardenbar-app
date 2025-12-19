import { connectDB } from '../lib/mongodb';
import AuditLogModel from '../models/audit-log-model';
import { IAuditLog, AuditAction } from '../interfaces/audit-log.interface';
import { Types } from 'mongoose';

export interface CreateAuditLogInput {
  userId: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service for managing audit logs
 */
export class AuditLogService {
  /**
   * Create audit log entry
   */
  static async createLog(input: CreateAuditLogInput): Promise<IAuditLog> {
    await connectDB();

    const log = await AuditLogModel.create({
      userId: new Types.ObjectId(input.userId),
      userEmail: input.userEmail,
      userRole: input.userRole,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      details: input.details,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return log.toObject();
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.resource) {
      query.resource = filters.resource;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get logs for specific resource
   */
  static async getResourceLogs(
    resource: string,
    resourceId: string,
    limit: number = 20
  ): Promise<IAuditLog[]> {
    await connectDB();

    const logs = await AuditLogModel.find({
      resource,
      resourceId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs;
  }

  /**
   * Get user activity logs
   */
  static async getUserLogs(
    userId: string,
    limit: number = 50
  ): Promise<IAuditLog[]> {
    await connectDB();

    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const logs = await AuditLogModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs;
  }

  /**
   * Get audit log statistics
   */
  static async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByResource: Record<string, number>;
    logsByUser: { userId: string; userEmail: string; count: number }[];
  }> {
    await connectDB();

    const matchStage: Record<string, unknown> = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        (matchStage.createdAt as Record<string, unknown>).$gte = startDate;
      }
      if (endDate) {
        (matchStage.createdAt as Record<string, unknown>).$lte = endDate;
      }
    }

    const [totalLogs, byAction, byResource, byUser] = await Promise.all([
      AuditLogModel.countDocuments(matchStage),

      AuditLogModel.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ]),

      AuditLogModel.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: '$resource',
            count: { $sum: 1 },
          },
        },
      ]),

      AuditLogModel.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: {
              userId: '$userId',
              userEmail: '$userEmail',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const logsByAction: Record<string, number> = {};
    byAction.forEach((item: { _id: string; count: number }) => {
      logsByAction[item._id] = item.count;
    });

    const logsByResource: Record<string, number> = {};
    byResource.forEach((item: { _id: string; count: number }) => {
      logsByResource[item._id] = item.count;
    });

    const logsByUser = byUser.map(
      (item: { _id: { userId: string; userEmail: string }; count: number }) => ({
        userId: item._id.userId.toString(),
        userEmail: item._id.userEmail,
        count: item.count,
      })
    );

    return {
      totalLogs,
      logsByAction,
      logsByResource,
      logsByUser,
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  static async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }
}
