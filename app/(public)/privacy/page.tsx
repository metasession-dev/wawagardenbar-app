import { Container, MainLayout } from '@/components/shared/layout';

export const metadata = {
  title: 'Privacy Policy | Wawa Garden Bar',
  description: 'Privacy Policy for Wawa Garden Bar Application',
};

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <Container className="py-12 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: December 5, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Welcome to Wawa Garden Bar. We respect your privacy and are
              committed to protecting your personal data. This privacy policy
              will inform you as to how we look after your personal data when
              you visit our website or use our application and tell you about
              your privacy rights and how the law protects you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              2. The Data We Collect About You
            </h2>
            <p className="mb-4">
              We may collect, use, store and transfer different kinds of
              personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Identity Data:</strong> First name, last name, username
                or similar identifier.
              </li>
              <li>
                <strong>Contact Data:</strong> Billing address, delivery
                address, email address and telephone numbers.
              </li>
              <li>
                <strong>Financial Data:</strong> Payment card details (processed
                securely by our payment providers).
              </li>
              <li>
                <strong>Transaction Data:</strong> Details about payments to and
                from you and other details of products and services you have
                purchased from us.
              </li>
              <li>
                <strong>Social Media Data:</strong> Instagram handle (optional)
                for participation in our rewards program. We only access public
                information related to your participation in our campaigns.
              </li>
              <li>
                <strong>Technical Data:</strong> Internet protocol (IP) address,
                your login data, browser type and version, time zone setting and
                location, browser plug-in types and versions, operating system
                and platform, and other technology on the devices you use to
                access this website.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              3. How We Use Your Personal Data
            </h2>
            <p className="mb-4">
              We will only use your personal data when the law allows us to.
              Most commonly, we will use your personal data in the following
              circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To register you as a new customer.</li>
              <li>
                To process and deliver your order including managing payments,
                fees and charges.
              </li>
              <li>To manage our relationship with you.</li>
              <li>
                To enable you to partake in our loyalty and rewards program
                (including Instagram rewards).
              </li>
              <li>
                To improve our website, products/services, marketing, customer
                relationships and experiences.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your
              personal data from being accidentally lost, used or accessed in an
              unauthorized way, altered or disclosed. In addition, we limit
              access to your personal data to those employees, agents,
              contractors and other third parties who have a business need to
              know.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We will only retain your personal data for as long as reasonably
              necessary to fulfill the purposes we collected it for, including
              for the purposes of satisfying any legal, regulatory, tax,
              accounting or reporting requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Your Legal Rights</h2>
            <p className="mb-4">
              Under certain circumstances, you have rights under data protection
              laws in relation to your personal data, including the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request access to your personal data.</li>
              <li>Request correction of your personal data.</li>
              <li>Request erasure of your personal data.</li>
              <li>Object to processing of your personal data.</li>
              <li>Request restriction of processing your personal data.</li>
              <li>Request transfer of your personal data.</li>
              <li>Right to withdraw consent.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please utilize our{' '}
              <a href="/data-deletion" className="text-primary hover:underline">
                Data Deletion Request
              </a>{' '}
              tool or contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy
              practices, please visit our{' '}
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
