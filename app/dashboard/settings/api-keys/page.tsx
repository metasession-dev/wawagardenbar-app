import { Key, Info } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { ApiKeyService } from '@/services/api-key-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiKeysPageClient } from './api-keys-page-client';

export const metadata = {
  title: 'API Keys | Wawa Garden Bar',
};

export default async function ApiKeysPage() {
  await requireSuperAdmin();

  const keys = await ApiKeyService.listKeys({ includeInactive: true });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-sm text-muted-foreground">
              Manage programmatic access for external integrations
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          API keys allow external clients (mobile apps, POS systems, integrations) to access the
          API without browser sessions. Pass the key as{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">x-api-key: wawa_…</code> or{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
            Authorization: Bearer wawa_…
          </code>{' '}
          in request headers.
        </AlertDescription>
      </Alert>

      <ApiKeysPageClient initialKeys={keys} />
    </div>
  );
}
