import { Container, MainLayout } from '@/components/shared/layout';

export const metadata = {
  title: 'Terms of Service | Wawa Garden Bar',
  description: 'Terms of Service for Wawa Garden Bar Application',
};

export default function TermsOfServicePage() {
  return (
    <MainLayout>
      <Container className="py-12 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: October 21, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Wawa Garden Bar website or application
              (the &quot;Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the
              Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              2. Use of the Service
            </h2>
            <p className="mb-4">
              You agree to use the Service only for lawful purposes and in
              accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Use the Service in any way that violates applicable local,
                national, or international law.
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Service,
                other accounts, or systems.
              </li>
              <li>
                Use the Service to transmit any harmful, fraudulent, or abusive
                content.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Accounts</h2>
            <p>
              When you create an account with us, you must provide accurate and
              complete information. You are responsible for safeguarding the
              password and any other credentials used to access your account,
              and for any activity that occurs under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              4. Orders and Payments
            </h2>
            <p>
              Orders placed through the Service are subject to acceptance and
              availability. Prices, menu items, and promotions are subject to
              change without notice. Payments are processed securely through our
              third-party payment providers; we do not store full payment card
              details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              5. Loyalty and Rewards Program
            </h2>
            <p>
              Participation in our loyalty and rewards program (including any
              Instagram-linked rewards) is optional and governed by the
              program&apos;s specific rules, which may be updated from time to
              time. We reserve the right to modify, suspend, or terminate the
              program at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are owned by Wawa Garden Bar and are protected by applicable
              intellectual property laws. You may not reproduce, distribute, or
              create derivative works from any part of the Service without our
              prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any
              time, without prior notice, for conduct that we believe violates
              these Terms or is otherwise harmful to other users, us, or third
              parties, or for any other reason at our discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              8. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Wawa Garden Bar shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the
              Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              9. Changes to These Terms
            </h2>
            <p>
              We may revise these Terms from time to time. The updated version
              will be indicated by an updated &quot;Last updated&quot; date, and
              continued use of the Service after changes take effect constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the Federal Republic of Nigeria, without regard to its
              conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please visit our{' '}
              <a href="/contact" className="text-primary hover:underline">
                Contact Us
              </a>{' '}
              page.
            </p>
          </section>
        </div>
      </Container>
    </MainLayout>
  );
}
