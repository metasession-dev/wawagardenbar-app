import { MainLayout, Container } from '@/components/shared/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '+234 814 825 3342';
const CONTACT_EMAIL = 'ade@wawagardenbar.com';

/**
 * @requirement REQ-062 — Contact page (P1 #11).
 * @requirement REQ-112 — AC5: WhatsApp + email only, no hours/support ticket.
 *
 * Static page — the two contact methods are fixed, not admin-configurable,
 * so no SettingsService/Mongo fetch is needed.
 */
function phoneToWaLink(phone: string): string {
  // wa.me wants digits only, no + or spaces.
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export default function ContactPage() {
  return (
    <MainLayout>
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground">
            We&apos;re here to help. Reach out by WhatsApp or email.
          </p>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Reach us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* WhatsApp — primary contact per the project's strategic direction */}
            <a
              href={phoneToWaLink(WHATSAPP_NUMBER)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">WhatsApp (recommended)</p>
                <p className="text-sm text-muted-foreground">
                  {WHATSAPP_NUMBER}
                </p>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  );
}
