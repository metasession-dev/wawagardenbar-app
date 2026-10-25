/**
 * @requirement REQ-115 (AC6, AC11) — template contract test.
 *
 * Each docs/whatsapp-templates/<name>.json is the source of truth for a
 * template. For every one: the parameter builder returns exactly the number
 * of header / body / button variables the template declares, and the
 * template key exists in TEMPLATE_CATEGORIES with the same category.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import * as builders from '@/lib/whatsapp-template-params';
import { TEMPLATE_CATEGORIES } from '@/lib/notification-templates';
import type { WhatsAppTemplateParams } from '@/lib/whatsapp';

const DIR = join(process.cwd(), 'docs', 'whatsapp-templates');

interface TemplateJson {
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  builder: keyof typeof builders;
  header: { format: string; text: string; example: string[] } | null;
  body: { text: string; example: string[] };
  footer: string | null;
  buttons: Array<{
    type: string;
    text: string;
    url?: string;
    example?: string[];
  }>;
}

const CATEGORY_MAP = {
  UTILITY: 'transactional',
  MARKETING: 'marketing',
  AUTHENTICATION: 'authentication',
} as const;

const HOURS = { open: '11:00', close: '23:00', closed: false };
const WEEK = {
  monday: HOURS,
  tuesday: HOURS,
  wednesday: HOURS,
  thursday: HOURS,
  friday: HOURS,
  saturday: HOURS,
  sunday: HOURS,
};

// One representative input per builder.
const SAMPLE_CALLS: Record<string, () => WhatsAppTemplateParams> = {
  orderConfirmationParams: () =>
    builders.orderConfirmationParams({
      orderNumber: '1234',
      total: '₦5,500',
      estimatedTime: '25 minutes',
    }),
  orderStatusUpdateParams: () =>
    builders.orderStatusUpdateParams({
      orderNumber: '1234',
      statusText: 'ready for pickup',
    }),
  receiptParams: () =>
    builders.receiptParams({
      orderNumber: '1234',
      itemsList: '2× Goat Stew',
      total: '₦5,500',
      paymentMethod: 'Card',
      pointsEarned: '55',
    }),
  rewardEarnedParams: () =>
    builders.rewardEarnedParams({
      firstName: 'Ada',
      pointsEarned: '55',
      newBalance: '420',
      nairaEquivalent: '₦4,200',
    }),
  rewardExpiringSoonParams: () =>
    builders.rewardExpiringSoonParams({
      firstName: 'Ada',
      expiringPoints: '100',
      daysRemaining: '7',
      nairaEquivalent: '₦1,000',
    }),
  paymentLinkParams: () =>
    builders.paymentLinkParams({
      firstName: 'Ada',
      amount: '₦12,500',
      paymentUrl: 'https://paystack.com/pay/x',
      expiresInHours: '24',
    }),
  supportReplyParams: () =>
    builders.supportReplyParams({
      ticketNumber: 'TKT-1',
      customerName: 'Ada Obi',
      subject: 'Missing item',
      reply: 'Done',
    }),
  paymentConfirmationParams: () =>
    builders.paymentConfirmationParams({
      amount: '₦12,500',
      cardLast4: '1234',
    }),
  bankTransferDetailsParams: () =>
    builders.bankTransferDetailsParams({
      amount: '₦12,500',
      accountNumber: '9019823745',
      accountName: 'Wawa Garden Bar',
      bankName: 'Wema Bank',
      expiresInHours: '2',
    }),
  welcomeNewUserParams: () => builders.welcomeNewUserParams(WEEK),
  welcomeBackParams: () => builders.welcomeBackParams({ firstName: 'Ada' }),
  accountRecoveryParams: () => builders.accountRecoveryParams('+2348099994567'),
};

/** Number of distinct `{{n}}` variables in a template string. */
function countVariables(text: string | undefined | null): number {
  if (!text) return 0;
  return new Set(text.match(/\{\{\d+\}\}/g) ?? []).size;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const templates: TemplateJson[] = files.map((f) =>
  JSON.parse(readFileSync(join(DIR, f), 'utf8'))
);

describe('REQ-115 WhatsApp template contract', () => {
  it('[US-01.6] there is a JSON definition for every template in the doc', () => {
    expect(templates.length).toBe(12);
    const doc = readFileSync(
      join(process.cwd(), 'docs', 'whatsapp-templates.md'),
      'utf8'
    );
    const documented = [...doc.matchAll(/^## \d+\. `([a-z_]+)`/gm)].map(
      (m) => m[1]
    );
    expect(templates.map((t) => t.name).sort()).toEqual(documented.sort());
  });

  it('every JSON file is named after its template', () => {
    expect(files.sort()).toEqual(templates.map((t) => `${t.name}.json`).sort());
  });

  describe.each(templates.map((t) => [t.name, t] as const))(
    '%s',
    (_name, template) => {
      it('[US-01.6] exists in TEMPLATE_CATEGORIES with the same category', () => {
        expect(TEMPLATE_CATEGORIES[template.name]).toBe(
          CATEGORY_MAP[template.category]
        );
      });

      it('[US-01.6] its builder returns exactly the declared header/body/button variable counts', () => {
        const sample = SAMPLE_CALLS[template.builder];
        expect(
          sample,
          `no sample call for builder ${template.builder}`
        ).toBeDefined();
        const params = sample();

        const declaredHeader = countVariables(template.header?.text);
        const declaredBody = countVariables(template.body.text);
        const declaredButtons = template.buttons
          .map((b, index) => ({ index, count: countVariables(b.url) }))
          .filter((b) => b.count > 0);

        expect(params.headerParams?.length ?? 0).toBe(declaredHeader);
        expect(params.bodyParams.length).toBe(declaredBody);
        expect(
          (params.buttonParams ?? []).map((b) => ({
            index: b.index,
            count: b.params.length,
          }))
        ).toEqual(declaredButtons);
      });

      it('declares example values for every variable (Meta requires samples)', () => {
        expect(template.body.example.length).toBe(
          countVariables(template.body.text)
        );
        if (template.header) {
          expect(template.header.example.length).toBe(
            countVariables(template.header.text)
          );
        }
      });

      it('[AC6] uses only the production host in button URLs', () => {
        for (const button of template.buttons) {
          if (button.url && button.url.startsWith('http')) {
            expect(
              button.url.startsWith('https://app.wawagardenbar.com/')
            ).toBe(true);
          }
        }
      });
    }
  );

  it('[AC6] the doc has no apex-domain URLs', () => {
    const doc = readFileSync(
      join(process.cwd(), 'docs', 'whatsapp-templates.md'),
      'utf8'
    );
    expect(doc).not.toMatch(/https:\/\/wawagardenbar\.com/);
  });

  it('the event button of both welcome templates targets /book', () => {
    for (const name of ['welcome_new_user', 'welcome_back']) {
      const t = templates.find((x) => x.name === name)!;
      expect(
        t.buttons.some((b) => b.url === 'https://app.wawagardenbar.com/book')
      ).toBe(true);
    }
  });
});
