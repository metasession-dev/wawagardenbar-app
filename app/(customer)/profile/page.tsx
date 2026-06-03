import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/shared/layout';
import { Container } from '@/components/shared/layout';
import { ProfileService } from '@/services';
import { sessionOptions, SessionData } from '@/lib/session';
import { PersonalInfoTab } from '@/components/features/profile/personal-info-tab';
import { AddressesTab } from '@/components/features/profile/addresses-tab';
import { DataExportButton } from '@/components/features/profile/data-export-button';

export const metadata = {
  title: 'My Profile | Wawa Cafe',
  description: 'Manage your personal information and addresses',
};

/**
 * Profile page with tabbed interface
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Get session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login?redirect=/profile');
  }

  // Get user profile
  const profile = await ProfileService.getUserProfile(session.userId);

  if (!profile) {
    redirect('/login');
  }

  // Serialize profile to plain object for client components
  const serializedProfile = JSON.parse(JSON.stringify(profile));

  // Await searchParams (Next.js 15+)
  const params = await searchParams;
  const defaultTab = params.tab || 'personal';

  return (
    <MainLayout>
      <Container size="xl" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and addresses
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <PersonalInfoTab profile={serializedProfile} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Addresses</CardTitle>
                <CardDescription>
                  Manage your saved delivery addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <AddressesTab addresses={serializedProfile.addresses} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* REQ-065 — Your data section (#117 P4 #19). */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your data</CardTitle>
            <CardDescription>
              Download a copy of everything we have linked to your account —
              profile, orders, points transactions, tabs, rewards, support
              tickets, and message logs. Delivered as a single JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataExportButton />
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  );
}
