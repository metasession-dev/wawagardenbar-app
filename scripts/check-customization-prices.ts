import { config } from 'dotenv';
config({ path: '.env.local' });
import { connectToDatabase, disconnectFromDatabase } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';

async function main() {
  await connectToDatabase();
  const items = await MenuItemModel.find({
    'customizations.0': { $exists: true },
  }).lean();
  console.log(
    `menu items with at least one customization group: ${items.length}`
  );
  let optionsTotal = 0,
    optionsNonZero = 0;
  const offenders: Array<{
    item: string;
    group: string;
    option: string;
    price: number;
  }> = [];
  for (const it of items) {
    for (const g of (it as any).customizations || []) {
      for (const o of g.options || []) {
        optionsTotal++;
        if (typeof o.price === 'number' && o.price > 0) {
          optionsNonZero++;
          offenders.push({
            item: (it as any).name,
            group: g.name,
            option: o.name,
            price: o.price,
          });
        }
      }
    }
  }
  console.log(`total customization options: ${optionsTotal}`);
  console.log(`options with price > 0: ${optionsNonZero}`);
  if (offenders.length) {
    console.log('\nOffenders:');
    offenders.forEach((o) =>
      console.log(`  - ${o.item} / ${o.group} / ${o.option} → ₦${o.price}`)
    );
  } else {
    console.log(
      '\nVerdict: every customization option has price 0 or no price field — S17 can be safely waived for current data.'
    );
  }
  await disconnectFromDatabase();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
