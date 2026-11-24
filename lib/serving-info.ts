/**
 * @requirement REQ-KITCHEN-010 (REQ-124, AC4) — names and tables for the serving check.
 *
 * The order list is `.lean()` and unpopulated, so the account name (customer
 * orders) and the tab's customer name and table (tab orders) are looked up in
 * two batched queries. Best effort: a lookup failure leaves the label at
 * `No name` instead of failing the order list.
 */
import { Types } from 'mongoose';

export interface ServingInfo {
  servingName: string | null;
  tableNumber?: string;
}

interface OrderForServing {
  _id: { toString(): string };
  userId?: { toString(): string } | null;
  tabId?: { toString(): string } | null;
  guestName?: string | null;
  dineInDetails?: { tableNumber?: string } | null;
}

export async function resolveServingInfo(
  orders: OrderForServing[]
): Promise<Map<string, ServingInfo>> {
  const userIds = new Set<string>();
  const tabIds = new Set<string>();
  for (const o of orders) {
    if (o.userId) userIds.add(o.userId.toString());
    if (o.tabId) tabIds.add(o.tabId.toString());
  }

  const users = new Map<string, string>();
  const tabs = new Map<
    string,
    { customerName?: string; tableNumber?: string }
  >();

  const valid = (ids: Set<string>) =>
    [...ids].filter((id) => Types.ObjectId.isValid(id));

  try {
    if (userIds.size) {
      const { default: UserModel } = await import('@/models/user-model');
      const rows = await UserModel.find({ _id: { $in: valid(userIds) } })
        .select('name firstName')
        .lean<
          Array<{
            _id: { toString(): string };
            name?: string;
            firstName?: string;
          }>
        >();
      for (const u of rows) {
        const name = u.name || u.firstName;
        if (name) users.set(u._id.toString(), name);
      }
    }
  } catch (error) {
    console.error('resolveServingInfo: user lookup failed', error);
  }
  try {
    if (tabIds.size) {
      const { default: TabModel } = await import('@/models/tab-model');
      const rows = await TabModel.find({ _id: { $in: valid(tabIds) } })
        .select('customerName tableNumber')
        .lean<
          Array<{
            _id: { toString(): string };
            customerName?: string;
            tableNumber?: string;
          }>
        >();
      for (const t of rows) tabs.set(t._id.toString(), t);
    }
  } catch (error) {
    console.error('resolveServingInfo: tab lookup failed', error);
  }

  const result = new Map<string, ServingInfo>();
  for (const o of orders) {
    const tab = o.tabId ? tabs.get(o.tabId.toString()) : undefined;
    const account = o.userId ? users.get(o.userId.toString()) : undefined;
    result.set(o._id.toString(), {
      // customer orders: account name; staff orders: tab customer, then order name
      servingName: account || tab?.customerName || o.guestName || null,
      tableNumber:
        o.dineInDetails?.tableNumber || tab?.tableNumber || undefined,
    });
  }
  return result;
}
