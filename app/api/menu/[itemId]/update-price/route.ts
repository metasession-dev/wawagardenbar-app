import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { PriceHistoryService } from '@/services/price-history-service';
import { PriceChangeReason } from '@/interfaces';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check authentication
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super-admin can update prices
    if (session.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Only super-admin can update prices' },
        { status: 403 }
      );
    }

    const { itemId } = await params;
    const body = await request.json();
    const { price, costPerUnit, reason, showPrice, happyHourPrice } = body;

    // Validate input
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    if (typeof costPerUnit !== 'number' || costPerUnit < 0) {
      return NextResponse.json(
        { error: 'Invalid cost per unit' },
        { status: 400 }
      );
    }

    if (
      showPrice !== undefined &&
      (typeof showPrice !== 'number' || showPrice < 0)
    ) {
      return NextResponse.json(
        { error: 'Invalid show price' },
        { status: 400 }
      );
    }

    if (
      happyHourPrice !== undefined &&
      (typeof happyHourPrice !== 'number' || happyHourPrice < 0)
    ) {
      return NextResponse.json(
        { error: 'Invalid happy hour price' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // REQ-102: this legacy API predates show/happy-hour price. Callers that
    // don't send them keep the item's current values unchanged rather than
    // silently overwriting them with the new default price.
    await connectDB();
    const currentItem = await MenuItemModel.findById(itemId).lean();
    if (!currentItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }
    const resolvedShowPrice =
      typeof showPrice === 'number' ? showPrice : currentItem.showPrice;
    const resolvedHappyHourPrice =
      typeof happyHourPrice === 'number'
        ? happyHourPrice
        : currentItem.happyHourPrice;

    // Update price and create history
    await PriceHistoryService.updatePrice(
      itemId,
      price,
      costPerUnit,
      reason as PriceChangeReason,
      session.userId,
      resolvedShowPrice,
      resolvedHappyHourPrice
    );

    return NextResponse.json({
      success: true,
      message: 'Price updated successfully',
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    );
  }
}
