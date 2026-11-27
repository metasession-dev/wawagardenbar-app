import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { MainLayout, Container } from '@/components/shared/layout';
import { BookingForm } from '@/components/features/bookings/booking-form';
import { sessionOptions, SessionData } from '@/lib/session';
import { isCustomerSession } from '@/lib/roles';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Book a table or event | Wawa Garden Bar',
};

/**
 * The signed-in customer's name and verified phone, read on the server so the
 * form is prefilled on first paint and does not depend on a client fetch.
 */
async function loadPrefill(): Promise<{ name: string; phone: string }> {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId || session.isGuest) {
      return { name: '', phone: '' };
    }
    if (!isCustomerSession(session)) return { name: '', phone: '' };
    await connectDB();
    const user = await UserModel.findById(session.userId)
      .select('phone firstName lastName name')
      .lean<{
        phone?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
      } | null>();
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.name ||
      '';
    return { name, phone: user?.phone ?? '' };
  } catch {
    return { name: '', phone: '' };
  }
}

/**
 * @requirement REQ-BOOK-001 — Booking page (REQ-129, AC1)
 *
 * Public: anyone can open the page and fill the form. Submitting needs the
 * WhatsApp PIN sign-in, handled by the form.
 */
export default async function BookPage() {
  const prefill = await loadPrefill();
  return (
    <MainLayout>
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Book a table or an event</h1>
          <p className="text-muted-foreground">
            Tell us what you have in mind and we&apos;ll get back to you
            shortly.
          </p>
        </div>
        <div className="max-w-2xl">
          <BookingForm
            initialName={prefill.name}
            initialPhone={prefill.phone}
          />
        </div>
      </Container>
    </MainLayout>
  );
}
