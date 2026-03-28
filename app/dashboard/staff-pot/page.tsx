/**
 * @requirement REQ-015 - Staff Pot tracker page
 */
import { Metadata } from 'next';
import { StaffPotClient } from './staff-pot-client';

export const metadata: Metadata = {
  title: 'Staff Pot | Wawa Garden Bar',
  description: 'Track team bonus progress',
};

export default function StaffPotPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff Pot</h2>
        <p className="text-muted-foreground">
          Track your team bonus — earn more when the business does well
        </p>
      </div>
      <StaffPotClient />
    </div>
  );
}
