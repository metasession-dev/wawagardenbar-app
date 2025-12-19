import { SettingsService } from '@/services';
import { SystemSettingsService } from '@/services/system-settings-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/features/admin/settings-form';
import { PaymentSettingsForm } from '@/components/features/admin/payment-settings-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserX, Users } from 'lucide-react';

export const metadata = {
  title: 'Settings | Admin Dashboard',
  description: 'Manage application settings',
};

/**
 * Settings management page
 * Super-admin only
 */
export default async function SettingsPage() {
  // Get current settings
  const [settings, notificationSettings, paymentSettings] = await Promise.all([
    SettingsService.getSettings(),
    SystemSettingsService.getNotificationSettings(),
    SystemSettingsService.getPaymentSettings(),
  ]);

  // Serialize for client - use JSON.parse(JSON.stringify()) to remove Mongoose metadata
  const plainSettings = JSON.parse(JSON.stringify(settings));
  
  const serializedSettings = {
    serviceFeePercentage: plainSettings.serviceFeePercentage,
    deliveryFeeBase: plainSettings.deliveryFeeBase,
    deliveryFeeReduced: plainSettings.deliveryFeeReduced,
    freeDeliveryThreshold: plainSettings.freeDeliveryThreshold,
    minimumOrderAmount: plainSettings.minimumOrderAmount,
    taxPercentage: plainSettings.taxPercentage,
    taxEnabled: plainSettings.taxEnabled,
    estimatedPreparationTime: plainSettings.estimatedPreparationTime,
    maxOrdersPerHour: plainSettings.maxOrdersPerHour,
    allowGuestCheckout: plainSettings.allowGuestCheckout,
    deliveryRadius: plainSettings.deliveryRadius,
    deliveryEnabled: plainSettings.deliveryEnabled,
    pickupEnabled: plainSettings.pickupEnabled,
    dineInEnabled: plainSettings.dineInEnabled,
    businessHours: plainSettings.businessHours,
    contactEmail: plainSettings.contactEmail,
    contactPhone: plainSettings.contactPhone,
    address: plainSettings.address,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage application settings and configuration
        </p>
      </div>

      {/* Admin Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>
              Manage admin users and permissions
            </CardDescription>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard/settings/admins">
              Manage Admins
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Data Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage user data deletion requests
            </CardDescription>
          </div>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard/settings/data-requests">
              View Deletion Requests
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <PaymentSettingsForm initialSettings={paymentSettings} />

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Configure fees, business hours, and other application settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm 
            initialSettings={serializedSettings} 
            notificationSettings={notificationSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
