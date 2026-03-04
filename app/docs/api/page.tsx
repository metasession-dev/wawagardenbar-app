import { Metadata } from 'next';
import { ApiDocsClient } from '@/components/features/api-docs/api-docs-client';

export const metadata: Metadata = {
  title: 'API Documentation — Wawa Garden Bar',
  description: 'Complete REST API reference for the Wawa Garden Bar public API.',
};

export default function ApiDocsPage(): JSX.Element {
  return <ApiDocsClient />;
}
