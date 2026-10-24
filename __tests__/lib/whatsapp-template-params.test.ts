/**
 * @requirement REQ-115 — WhatsApp template parameter builders
 */
import { describe, it, expect } from 'vitest';
import {
  accountRecoveryParams,
  firstNameOrFallback,
  supportReplyParams,
  welcomeBackParams,
  welcomeNewUserParams,
} from '@/lib/whatsapp-template-params';

const HOURS = {
  monday: { open: '09:00', close: '22:00', closed: false },
  tuesday: { open: '09:00', close: '22:00', closed: false },
  wednesday: { open: '09:00', close: '22:00', closed: false },
  thursday: { open: '09:00', close: '22:00', closed: false },
  friday: { open: '11:30', close: '23:30', closed: false },
  saturday: { open: '11:30', close: '23:30', closed: false },
  sunday: { open: '12:00', close: '20:00', closed: true },
};

describe('REQ-115 welcome_new_user params (AC1)', () => {
  it('AC1 — uses today’s opening and closing time formatted h:mm a', () => {
    // 2026-10-23 is a Friday (business timezone: midday UTC is safely Friday).
    const params = welcomeNewUserParams(
      HOURS,
      new Date('2026-10-23T12:00:00Z')
    );
    expect(params.bodyParams).toEqual(['11:30 AM', '11:30 PM']);
    expect(params.headerParams).toBeUndefined();
  });

  it('AC1 — always returns exactly two body params, even when closed today', () => {
    const params = welcomeNewUserParams(
      HOURS,
      new Date('2026-10-25T12:00:00Z')
    );
    expect(params.bodyParams).toHaveLength(2);
  });
});

describe('REQ-115 welcome_back params (AC1)', () => {
  it('AC1 — first name only', () => {
    expect(
      welcomeBackParams({ firstName: 'Ada', name: 'Ada Obi' }).bodyParams
    ).toEqual(['Ada']);
    expect(welcomeBackParams({ name: 'Ada Obi' }).bodyParams).toEqual(['Ada']);
  });

  it('AC1 — falls back to "there"', () => {
    expect(welcomeBackParams({}).bodyParams).toEqual(['there']);
    expect(firstNameOrFallback('   ')).toBe('there');
  });
});

describe('REQ-115 support_reply params (AC2)', () => {
  it('AC2 — header [ticket no.], body [first name, subject, reply]', () => {
    const params = supportReplyParams({
      ticketNumber: 'TKT-100',
      customerName: 'Ada Obi',
      subject: 'Missing item',
      reply: 'We added a replacement.',
    });
    expect(params.headerParams).toEqual(['TKT-100']);
    expect(params.bodyParams).toEqual([
      'Ada',
      'Missing item',
      'We added a replacement.',
    ]);
  });

  it('flattens newlines and trims long replies to fit Meta’s variable rules', () => {
    const params = supportReplyParams({
      ticketNumber: 'TKT-1',
      subject: 'Line one\nLine two',
      reply: 'x'.repeat(900),
    });
    expect(params.bodyParams[0]).toBe('there');
    expect(params.bodyParams[1]).toBe('Line one Line two');
    expect(params.bodyParams[2]).toHaveLength(700);
    expect(params.bodyParams[2].endsWith('…')).toBe(true);
  });
});

describe('REQ-115 account_recovery params', () => {
  it('is the last four digits of the phone on file', () => {
    expect(accountRecoveryParams('+2348099998888').bodyParams).toEqual([
      '8888',
    ]);
  });
});
