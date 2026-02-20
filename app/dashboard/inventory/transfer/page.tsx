import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import { StockTransferClient } from '@/components/features/inventory/stock-transfer-client';

async function getSession() {
  const cookieStore = await cookies();
  return await getIronSession<SessionData>(cookieStore, sessionOptions);
}

async function getInventoryItems() {
  await connectDB();
  
  const items = await InventoryModel.find({ trackByLocation: true })
    .populate('menuItemId', 'name')
    .lean();
  
  return items.map(item => ({
    id: item._id.toString(),
    name: (item.menuItemId as any)?.name || 'Unknown Item',
    currentStock: item.currentStock,
    unit: item.unit,
    trackByLocation: item.trackByLocation,
    locations: item.locations.map(loc => ({
      location: loc.location,
      currentStock: loc.currentStock,
    })),
  }));
}

export default async function StockTransferPage() {
  const session = await getSession();
  
  if (!session.isLoggedIn || !session.role || !['admin', 'super-admin'].includes(session.role)) {
    redirect('/dashboard');
  }
  
  const inventoryItems = await getInventoryItems();
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Stock Transfer</h1>
        <p className="text-muted-foreground">
          Move inventory between storage locations
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <StockTransferClient inventoryItems={inventoryItems} />
      </Suspense>
    </div>
  );
}
