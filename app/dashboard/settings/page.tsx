import { SettingsService } from '@/services';
import { SystemSettingsService } from '@/services/system-settings-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsForm } from '@/components/features/admin/settings-form';
import { PaymentSettingsForm } from '@/components/features/admin/payment-settings-form';
import { ExpenseCategoriesForm } from '@/components/features/admin/expense-categories-form';
import { MenuCategoriesForm } from '@/components/features/admin/menu-categories-form';
import { MainCategoriesForm } from '@/components/features/admin/main-categories-form';
import { UnitsOfMeasurementForm } from '@/components/features/admin/units-of-measurement-form';
import { StaffPotConfigForm } from '@/components/features/admin/staff-pot/staff-pot-config-form';
import { BusinessDayCutoffForm } from '@/components/features/admin/business-day-cutoff-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Key, UserX, Users, PiggyBank, CalendarClock } from 'lucide-react';

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
  const [
    settings,
    notificationSettings,
    paymentSettings,
    expenseCategories,
    menuSettings,
    mainCategoriesList,
    inventoryLocationsSettings,
    staffPotConfig,
    businessDayCutoff,
    unitsOfMeasurement,
  ] = await Promise.all([
    SettingsService.getSettings(),
    SystemSettingsService.getNotificationSettings(),
    SystemSettingsService.getPaymentSettings(),
    SystemSettingsService.getExpenseCategories(),
    SystemSettingsService.getMenuCategories(),
    // REQ-075 — Configurable main-category registry feeds both the new
    // MainCategoriesForm and the dynamic-tab MenuCategoriesForm below.
    SystemSettingsService.getMainCategories(),
    SystemSettingsService.getInventoryLocations(),
    SystemSettingsService.getStaffPotConfig(),
    SystemSettingsService.getBusinessDayCutoff(),
    SystemSettingsService.getUnitsOfMeasurement(),
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
            <Link href="/dashboard/settings/admins">Manage Admins</Link>
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage programmatic access for external integrations
            </CardDescription>
          </div>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard/settings/api-keys">Manage API Keys</Link>
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

      {/* Expense Categories */}
      <ExpenseCategoriesForm initialCategories={expenseCategories} />

      {/* Units of Measurement (REQ-033) */}
      <UnitsOfMeasurementForm initialUnits={unitsOfMeasurement} />

      {/* Main Categories (REQ-075) */}
      <MainCategoriesForm initialCategories={mainCategoriesList} />

      {/* Menu Categories */}
      <MenuCategoriesForm
        initialSettings={menuSettings}
        mainCategories={mainCategoriesList}
      />

      {/* Business Day Cutoff */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Business Day Cutoff
            </CardTitle>
            <CardDescription>
              Set the time after which orders and tabs belong to the current
              calendar day. Before this time, admin staff will be prompted to
              attribute them to the previous business day.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BusinessDayCutoffForm initialCutoff={businessDayCutoff} />
        </CardContent>
      </Card>

      {/* Staff Pot Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Staff Pot (Team Bonus)
            </CardTitle>
            <CardDescription>
              Configure daily revenue target, bonus percentage, and team split
              for the staff pot incentive
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <StaffPotConfigForm initialConfig={staffPotConfig} />
        </CardContent>
      </Card>

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
            inventoryLocationsSettings={inventoryLocationsSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
