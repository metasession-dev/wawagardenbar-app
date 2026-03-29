/**
 * @requirement REQ-015 - Staff Pot start date filtering logic
 */
import { describe, it, expect } from 'vitest';
import {
  startOfDay,
  startOfMonth,
  endOfMonth,
  isBefore,
  eachDayOfInterval,
} from 'date-fns';

interface StaffPotConfig {
  dailyTarget: number;
  bonusPercentage: number;
  kitchenSplitRatio: number;
  barSplitRatio: number;
  kitchenStaffCount: number;
  barStaffCount: number;
  startDate?: string;
}

/**
 * Extracted start date filtering logic from StaffPotService.getMonthData
 */
function computeEffectiveRange(
  month: number,
  year: number,
  config: StaffPotConfig,
  today: Date
): { effectiveStart: Date; lastDay: Date } | null {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const now = startOfDay(today);
  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
  const lastDay = isCurrentMonth ? now : monthEnd;

  let effectiveStart = monthStart;
  if (config.startDate) {
    const configStart = startOfDay(new Date(config.startDate));
    if (isBefore(monthStart, configStart) && !isBefore(lastDay, configStart)) {
      effectiveStart = configStart;
    } else if (isBefore(lastDay, configStart)) {
      return null; // entire month before start date
    }
  }

  return { effectiveStart, lastDay };
}

function getDaysInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}

const baseConfig: StaffPotConfig = {
  dailyTarget: 50000,
  bonusPercentage: 5,
  kitchenSplitRatio: 50,
  barSplitRatio: 50,
  kitchenStaffCount: 2,
  barStaffCount: 2,
};

describe('REQ-015: Start Date — Effective Range Calculation', () => {
  it('should use month start when no startDate is configured', () => {
    const config = { ...baseConfig };
    const today = new Date(2026, 2, 28); // March 28, 2026
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).not.toBeNull();
    expect(result!.effectiveStart.getDate()).toBe(1); // March 1
    expect(result!.effectiveStart.getMonth()).toBe(2);
  });

  it('should use startDate when it falls within the current month', () => {
    const config = { ...baseConfig, startDate: '2026-03-15' };
    const today = new Date(2026, 2, 28);
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).not.toBeNull();
    expect(result!.effectiveStart.getDate()).toBe(15); // March 15
  });

  it('should return null when entire month is before startDate', () => {
    const config = { ...baseConfig, startDate: '2026-04-01' };
    const today = new Date(2026, 2, 28); // March 28
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).toBeNull();
  });

  it('should use month start when startDate is before the month', () => {
    const config = { ...baseConfig, startDate: '2026-01-15' };
    const today = new Date(2026, 2, 28); // March 28
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).not.toBeNull();
    expect(result!.effectiveStart.getDate()).toBe(1); // March 1 (startDate already passed)
  });

  it('should exclude days before startDate from the range', () => {
    const config = { ...baseConfig, startDate: '2026-03-20' };
    const today = new Date(2026, 2, 28);
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).not.toBeNull();
    const days = getDaysInRange(result!.effectiveStart, result!.lastDay);
    expect(days.length).toBe(9); // March 20-28 = 9 days
    expect(days[0].getDate()).toBe(20);
  });

  it('should handle startDate on the 1st (same as default)', () => {
    const config = { ...baseConfig, startDate: '2026-03-01' };
    const today = new Date(2026, 2, 28);
    const result = computeEffectiveRange(2, 2026, config, today);

    expect(result).not.toBeNull();
    const days = getDaysInRange(result!.effectiveStart, result!.lastDay);
    expect(days.length).toBe(28);
  });

  it('should handle past month with startDate mid-month', () => {
    const config = { ...baseConfig, startDate: '2026-02-10' };
    const today = new Date(2026, 2, 28); // viewing Feb from March
    const result = computeEffectiveRange(1, 2026, config, today);

    expect(result).not.toBeNull();
    expect(result!.effectiveStart.getDate()).toBe(10); // Feb 10
    // lastDay should be end of Feb (28th in 2026)
    expect(result!.lastDay.getDate()).toBe(28);
    const days = getDaysInRange(result!.effectiveStart, result!.lastDay);
    expect(days.length).toBe(19); // Feb 10-28 = 19 days
  });
});
