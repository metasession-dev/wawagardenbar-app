/**
 * @requirement REQ-120 (AC5) - `origin` on every order, with an idempotent migration
 *
 * Rule from the issue: an existing order whose `createdByRole` is `customer`
 * (or missing, which is what the schema defaulted to) becomes
 * `origin: 'customer'`; every other order becomes `origin: 'staff'`.
 * Only orders with no `origin` are touched, so a second run changes nothing.
 */

export interface OriginMigrationModel {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount?: number }>;
}

export interface OriginMigrationResult {
  customer: number;
  staff: number;
  applied: boolean;
}

export const NEEDS_CUSTOMER_ORIGIN = {
  origin: { $exists: false },
  $or: [{ createdByRole: 'customer' }, { createdByRole: { $exists: false } }],
};

export const NEEDS_STAFF_ORIGIN = {
  origin: { $exists: false },
  createdByRole: { $exists: true, $nin: ['customer'] },
};

export async function runOrderOriginMigration(
  model: OriginMigrationModel,
  options: { apply: boolean }
): Promise<OriginMigrationResult> {
  if (!options.apply) {
    return {
      customer: await model.countDocuments(NEEDS_CUSTOMER_ORIGIN),
      staff: await model.countDocuments(NEEDS_STAFF_ORIGIN),
      applied: false,
    };
  }
  const customer = await model.updateMany(NEEDS_CUSTOMER_ORIGIN, {
    $set: { origin: 'customer' },
  });
  const staff = await model.updateMany(NEEDS_STAFF_ORIGIN, {
    $set: { origin: 'staff' },
  });
  return {
    customer: customer.modifiedCount ?? 0,
    staff: staff.modifiedCount ?? 0,
    applied: true,
  };
}
