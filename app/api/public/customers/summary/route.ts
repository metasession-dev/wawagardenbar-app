import { NextRequest } from 'next/server';
import { eachDayOfInterval, format, startOfDay, endOfDay } from 'date-fns';
import UserModel from '@/models/user-model';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';
import { parsePeriodParams } from '@/lib/date-periods';

/**
 * GET /api/public/customers/summary
 *
 * Period-based customer summary optimized for AI agent consumption.
 * Returns total customer counts, new registrations, top spenders,
 * loyalty points stats, and daily acquisition series.
 *
 * @authentication API Key required — scope: `customers:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [period=today] - Period preset
 * @queryParam {string} [startDate]    - ISO 8601 start (required when period is "custom")
 * @queryParam {string} [endDate]      - ISO 8601 end (required when period is "custom")
 *
 * @returns {Object} response.data.period             - { label, startDate, endDate }
 * @returns {Object} response.data.totals             - { totalCustomers, newCustomersInPeriod, totalSpent, averageSpent, totalLoyaltyPoints }
 * @returns {Object[]} response.data.topSpenders      - Top 10 by totalSpent [{ _id, firstName, lastName, email, totalSpent, totalOrders }]
 * @returns {Object} response.data.byRole             - { customer, admin, "super-admin" }
 * @returns {Object[]} response.data.acquisitionSeries - [{ date, newCustomers }]
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['customers:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const dateRange = parsePeriodParams(searchParams);
      const { startDate, endDate, label } = dateRange;

      // Exclude sensitive fields
      const safeSelect = '-pinHash -pinExpiry -loginToken -loginTokenExpiry -__v';

      // Total customers (all time)
      const totalCustomers = await UserModel.countDocuments({
        role: 'customer',
        accountStatus: { $ne: 'deleted' },
      });

      // New customers in period
      const newCustomersInPeriod = await UserModel.countDocuments({
        role: 'customer',
        accountStatus: { $ne: 'deleted' },
        createdAt: { $gte: startDate, $lte: endDate },
      });

      // Aggregate spending stats for all customers
      const allCustomers = await UserModel.find({
        role: 'customer',
        accountStatus: { $ne: 'deleted' },
      })
        .select(safeSelect)
        .lean();

      const totalSpent = allCustomers.reduce((s, c: any) => s + (c.totalSpent || 0), 0);
      const totalLoyaltyPoints = allCustomers.reduce((s, c: any) => s + (c.loyaltyPoints || 0), 0);

      // Top spenders
      const topSpenders = [...allCustomers]
        .sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 10)
        .map((c: any) => ({
          _id: c._id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          totalSpent: c.totalSpent || 0,
          totalOrders: c.totalOrders || 0,
          loyaltyPoints: c.loyaltyPoints || 0,
        }));

      // By role
      const byRole: Record<string, number> = {};
      const allUsers = await UserModel.find({ accountStatus: { $ne: 'deleted' } })
        .select('role')
        .lean();
      for (const u of allUsers) {
        const role = (u as any).role || 'customer';
        byRole[role] = (byRole[role] || 0) + 1;
      }

      // Daily acquisition series
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const newUsersInRange = await UserModel.find({
        role: 'customer',
        accountStatus: { $ne: 'deleted' },
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .select('createdAt')
        .lean();

      const acquisitionSeries = days.map((day) => {
        const ds = startOfDay(day);
        const de = endOfDay(day);
        const count = newUsersInRange.filter((u) => {
          const d = new Date(u.createdAt);
          return d >= ds && d <= de;
        }).length;
        return { date: format(day, 'yyyy-MM-dd'), newCustomers: count };
      });

      return apiSuccess(serialize({
        period: { label, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        totals: {
          totalCustomers,
          newCustomersInPeriod,
          totalSpent,
          averageSpent: allCustomers.length > 0 ? Math.round(totalSpent / allCustomers.length) : 0,
          totalLoyaltyPoints,
        },
        topSpenders,
        byRole,
        acquisitionSeries,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate customer summary';
      console.error('[PUBLIC API] GET /api/public/customers/summary', error);
      return apiError(msg, 500);
    }
  });
}
