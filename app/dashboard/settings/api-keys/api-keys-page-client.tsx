'use client';

import { useState, useTransition } from 'react';
import { IApiKeyPublic } from '@/interfaces/api-key.interface';
import { listApiKeysAction } from '@/app/actions/admin/api-key-actions';
import { ApiKeysTable } from '@/components/features/admin/api-keys/api-keys-table';
import { CreateApiKeyDialog } from '@/components/features/admin/api-keys/create-api-key-dialog';

interface ApiKeysPageClientProps {
  initialKeys: IApiKeyPublic[];
}

export function ApiKeysPageClient({ initialKeys }: ApiKeysPageClientProps) {
  const [keys, setKeys] = useState<IApiKeyPublic[]>(initialKeys);
  const [, startTransition] = useTransition();

  function refresh(): void {
    startTransition(async () => {
      const result = await listApiKeysAction();
      if (result.success && result.keys) {
        setKeys(result.keys);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateApiKeyDialog onCreated={refresh} />
      </div>
      <ApiKeysTable keys={keys} onRefresh={refresh} />
    </div>
  );
}
