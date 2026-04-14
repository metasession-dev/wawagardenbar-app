/**
 * Quick diagnostic: check paid orders in the UAT database
 * Usage: npx tsx scripts/diagnose-uat.ts
 */
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  const uri = process.env.MONGODB_UAT_EXTERNAL_URI;
  if (!uri) {
    console.error('MONGODB_UAT_EXTERNAL_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  // Try wawagardenbar first (prod sync), then wawagardenbar_uat
  let db = client.db('wawagardenbar');
  const orderCount = await db.collection('orders').countDocuments({});
  if (orderCount === 0) {
    db = client.db('wawagardenbar_uat');
  }
  console.log('Database:', db.databaseName);

  const totalOrders = await db.collection('orders').countDocuments({});
  const totalPaid = await db
    .collection('orders')
    .countDocuments({ paymentStatus: 'paid' });
  const pending = await db
    .collection('orders')
    .countDocuments({ paymentStatus: 'pending' });

  const missingBizDate = await db.collection('orders').countDocuments({
    paymentStatus: 'paid',
    $or: [{ businessDate: { $exists: false } }, { businessDate: null }],
  });

  const missingPaidAt = await db.collection('orders').countDocuments({
    paymentStatus: 'paid',
    $or: [{ paidAt: { $exists: false } }, { paidAt: null }],
  });

  const missingBoth = await db.collection('orders').countDocuments({
    paymentStatus: 'paid',
    $or: [{ paidAt: { $exists: false } }, { paidAt: null }],
    $and: [
      { $or: [{ businessDate: { $exists: false } }, { businessDate: null }] },
    ],
  });

  console.log('\n=== ORDER SUMMARY ===');
  console.log('Total orders:', totalOrders);
  console.log('Paid:', totalPaid);
  console.log('Pending:', pending);
  console.log('Paid missing businessDate:', missingBizDate);
  console.log('Paid missing paidAt:', missingPaidAt);
  console.log('Paid missing BOTH:', missingBoth);

  // Show last 5 paid orders with all relevant fields
  const recent = await db
    .collection('orders')
    .find({ paymentStatus: 'paid' })
    .sort({ createdAt: -1 })
    .limit(5)
    .project({
      orderNumber: 1,
      total: 1,
      paidAt: 1,
      businessDate: 1,
      paymentMethod: 1,
      paymentStatus: 1,
      createdAt: 1,
      orderType: 1,
    })
    .toArray();

  console.log('\n=== RECENT PAID ORDERS ===');
  for (const o of recent) {
    console.log(
      `${o.orderNumber} | ₦${o.total} | type=${o.orderType} | method=${o.paymentMethod || 'NONE'} | paidAt=${o.paidAt ? o.paidAt.toISOString() : 'MISSING'} | bizDate=${o.businessDate ? o.businessDate.toISOString() : 'MISSING'} | created=${o.createdAt.toISOString()}`
    );
  }

  // Show last 5 closed tabs
  const tabs = await db
    .collection('tabs')
    .find({ status: 'closed' })
    .sort({ closedAt: -1 })
    .limit(5)
    .project({
      tabNumber: 1,
      total: 1,
      paidAt: 1,
      businessDate: 1,
      closedAt: 1,
      paymentStatus: 1,
    })
    .toArray();

  console.log('\n=== RECENT CLOSED TABS ===');
  for (const t of tabs) {
    console.log(
      `${t.tabNumber} | ₦${t.total} | paidAt=${t.paidAt ? t.paidAt.toISOString() : 'MISSING'} | bizDate=${t.businessDate ? t.businessDate.toISOString() : 'MISSING'} | closed=${t.closedAt ? t.closedAt.toISOString() : 'MISSING'}`
    );
  }

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
