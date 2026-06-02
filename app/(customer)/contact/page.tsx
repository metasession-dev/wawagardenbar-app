import { MainLayout, Container } from '@/components/shared/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MessageCircle, Clock } from 'lucide-react';
import { SettingsService } from '@/services/settings-service';
import { SupportForm } from '@/components/features/communication/support-form';

// REQ-062 — Force dynamic rendering. SettingsService.getSettings() hits
// Mongo, so static pre-render at build time fails (no DB available during
// `next build`). Marking the route dynamic skips the pre-render attempt.
export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-062 — Contact page (P1 #11).
 *
 * Server component. Renders the bar's hours (from SettingsService),
 * contact methods (phone with tel: + WhatsApp click-to-message links,
 * email mailto), and embeds the existing <SupportForm /> dialog so
 * customers can file a support ticket without leaving the page.
 */
const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
type DayKey = (typeof DAY_KEYS)[number];

function formatDayLabel(day: DayKey): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function phoneToWaLink(phone: string): string {
  // wa.me wants digits only, no + or spaces.
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export default async function ContactPage() {
  const settings = await SettingsService.getSettings();
  const phone = settings.contactPhone;
  const email = settings.contactEmail;

  return (
    <MainLayout>
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground">
            We&apos;re here to help. Reach out by WhatsApp, phone, or email — or
            file a support ticket below.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {DAY_KEYS.map((day) => {
                  const hours = settings.businessHours[day];
                  return (
                    <li key={day} className="flex justify-between">
                      <span className="font-medium">{formatDayLabel(day)}</span>
                      <span className="text-muted-foreground">
                        {hours.closed
                          ? 'Closed'
                          : `${hours.open} – ${hours.close}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Contact methods */}
          <Card>
            <CardHeader>
              <CardTitle>Reach us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* WhatsApp — primary contact per the project's strategic direction */}
              <a
                href={phoneToWaLink(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">WhatsApp (recommended)</p>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </div>
              </a>

              {/* Phone (click-to-call on mobile) */}
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <Phone className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Call us</p>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Support ticket */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>File a support ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Have an order issue, payment question, or general feedback? Open a
              ticket and our team will get back to you.
            </p>
            <SupportForm />
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  );
}
