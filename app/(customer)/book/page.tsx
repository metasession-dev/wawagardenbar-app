import { MainLayout, Container } from '@/components/shared/layout';
import { BookingForm } from '@/components/features/bookings/booking-form';

export const metadata = {
  title: 'Book a table or event | Wawa Garden Bar',
};

/**
 * @requirement REQ-BOOK-001 — Booking page (REQ-129, AC1)
 *
 * Public: anyone can open the page and fill the form. Submitting needs the
 * WhatsApp PIN sign-in, handled by the form.
 */
export default function BookPage() {
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
          <BookingForm />
        </div>
      </Container>
    </MainLayout>
  );
}
