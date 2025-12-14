import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import InventoryModel from '@/models/inventory-model';
import { connectToDatabase } from '@/lib/mongodb';

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET() {
  try {
    const session = await getSession();

    // Check authentication
    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization - only super-admin and admin can access
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Fetch all inventory items with menu item details
    const rawItems = await InventoryModel.find()
      .populate('menuItemId', 'name category')
      .sort({ status: 1 })
      .lean();

    // Transform items to include menuItemName
    const items = rawItems.map((item: any) => ({
      _id: item._id.toString(),
      menuItemName: item.menuItemId?.name || 'Unknown Item',
      category: item.menuItemId?.category || '',
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      maximumStock: item.maximumStock,
      unit: item.unit,
      status: item.status,
      costPerUnit: item.costPerUnit,
      supplier: item.supplier,
      lastRestockDate: item.lastRestocked,
    }));

    // Calculate statistics
    const stats = {
      totalItems: items.length,
      inStock: items.filter(item => item.status === 'in-stock').length,
      lowStock: items.filter(item => item.status === 'low-stock').length,
      outOfStock: items.filter(item => item.status === 'out-of-stock').length,
      totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0),
      needsReorder: items.filter(item => 
        item.status === 'low-stock' || item.status === 'out-of-stock'
      ).length,
    };

    return NextResponse.json({
      items,
      stats,
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    );
  }
}
