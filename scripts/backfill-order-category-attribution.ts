/**
 * @requirement REQ-094 — Backfill legacy order-line category provenance.
 *
 * This is deliberately additive and idempotent. It never claims that current
 * menu metadata is original sale-time evidence; rows written by this script
 * are marked `legacy_current_menu_fallback` for reviewer-visible disclosure.
 *
 * Usage:
 *   npx tsx scripts/backfill-order-category-attribution.ts --dry-run
 *   npx tsx scripts/backfill-order-category-attribution.ts --apply
 */
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import MenuItemModel from '@/models/menu-item-model';

const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;

async function main() {
  await connectDB();

  const orders = await OrderModel.find({
    items: { $elemMatch: { mainCategoryAtSale: { $exists: false } } },
  }).lean();

  let examined = 0;
  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const nextItems = [];
    let changed = false;
    for (const item of order.items) {
      examined += 1;
      if (item.mainCategoryAtSale && item.categoryAtSale) {
        nextItems.push(item);
        continue;
      }
      const menuItem = await MenuItemModel.findById(item.menuItemId)
        .select('mainCategory category')
        .lean();
      if (!menuItem) {
        skipped += 1;
        nextItems.push(item);
        continue;
      }
      changed = true;
      nextItems.push({
        ...item,
        mainCategoryAtSale: menuItem.mainCategory,
        categoryAtSale: menuItem.category,
        categoryAtSaleSource: 'legacy_current_menu_fallback' as const,
      });
    }
    if (changed) {
      updated += 1;
      if (apply) {
        await OrderModel.updateOne(
          { _id: order._id },
          { $set: { items: nextItems } }
        );
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        ordersExamined: orders.length,
        itemsExamined: examined,
        ordersUpdated: updated,
        itemsSkipped: skipped,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
