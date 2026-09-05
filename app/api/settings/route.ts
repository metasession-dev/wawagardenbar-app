import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { SettingsService } from '@/services';
import { AuditLogService } from '@/services/audit-log-service';

/**
 * GET /api/settings
 * Get application settings
 * Public endpoint - returns non-sensitive settings
 */
export async function GET() {
  try {
    const settings = await SettingsService.getSettings();

    // Return serialized settings
    return NextResponse.json({
      success: true,
      data: {
        serviceFeePercentage: settings.serviceFeePercentage,
        deliveryFeeBase: settings.deliveryFeeBase,
        deliveryFeeReduced: settings.deliveryFeeReduced,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        minimumOrderAmount: settings.minimumOrderAmount,
        taxPercentage: settings.taxPercentage,
        taxEnabled: settings.taxEnabled,
        estimatedPreparationTime: settings.estimatedPreparationTime,
        deliveryRadius: settings.deliveryRadius,
        deliveryEnabled: settings.deliveryEnabled,
        pickupEnabled: settings.pickupEnabled,
        dineInEnabled: settings.dineInEnabled,
        allowGuestCheckout: settings.allowGuestCheckout,
        businessHours: settings.businessHours,
        showPriceWindow: settings.showPriceWindow,
        happyHourWindow: settings.happyHourWindow,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        address: settings.address,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update application settings
 * Super-admin only
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and authorization
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId || session.role !== 'super-admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update settings
    const settings = await SettingsService.updateSettings(
      body,
      session.userId,
      session.email
    );

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'settings.update',
      resource: 'settings',
      resourceId: (settings._id as any).toString(),
      details: {
        updates: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        serviceFeePercentage: settings.serviceFeePercentage,
        deliveryFeeBase: settings.deliveryFeeBase,
        deliveryFeeReduced: settings.deliveryFeeReduced,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        minimumOrderAmount: settings.minimumOrderAmount,
        taxPercentage: settings.taxPercentage,
        taxEnabled: settings.taxEnabled,
        estimatedPreparationTime: settings.estimatedPreparationTime,
        maxOrdersPerHour: settings.maxOrdersPerHour,
        deliveryRadius: settings.deliveryRadius,
        deliveryEnabled: settings.deliveryEnabled,
        pickupEnabled: settings.pickupEnabled,
        dineInEnabled: settings.dineInEnabled,
        allowGuestCheckout: settings.allowGuestCheckout,
        businessHours: settings.businessHours,
        showPriceWindow: settings.showPriceWindow,
        happyHourWindow: settings.happyHourWindow,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        address: settings.address,
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
