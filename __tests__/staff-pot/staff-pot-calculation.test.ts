/**
 * @requirement REQ-015 - Staff Pot bonus calculation logic
 */
import { describe, it, expect } from 'vitest';

interface StaffPotConfig {
  dailyTarget: number;
  bonusPercentage: number;
  kitchenSplitRatio: number;
  barSplitRatio: number;
  kitchenStaffCount: number;
  barStaffCount: number;
}

function calculateContribution(
  revenue: number,
  config: StaffPotConfig
): number {
  const surplus = Math.max(0, revenue - config.dailyTarget);
  return Math.round(surplus * (config.bonusPercentage / 100) * 100) / 100;
}

function calculatePayouts(
  totalPot: number,
  config: StaffPotConfig
): {
  kitchenPayout: number;
  barPayout: number;
  kitchenPerPerson: number;
  barPerPerson: number;
} {
  const kitchenPayout =
    Math.round(totalPot * (config.kitchenSplitRatio / 100) * 100) / 100;
  const barPayout =
    Math.round(totalPot * (config.barSplitRatio / 100) * 100) / 100;
  return {
    kitchenPayout,
    barPayout,
    kitchenPerPerson:
      config.kitchenStaffCount > 0
        ? Math.round((kitchenPayout / config.kitchenStaffCount) * 100) / 100
        : 0,
    barPerPerson:
      config.barStaffCount > 0
        ? Math.round((barPayout / config.barStaffCount) * 100) / 100
        : 0,
  };
}

const defaultConfig: StaffPotConfig = {
  dailyTarget: 50000,
  bonusPercentage: 5,
  kitchenSplitRatio: 50,
  barSplitRatio: 50,
  kitchenStaffCount: 2,
  barStaffCount: 2,
};

describe('REQ-015: Pot Contribution Calculation', () => {
  it('should calculate contribution when revenue exceeds target', () => {
    // 70000 - 50000 = 20000 surplus, 5% = 1000
    expect(calculateContribution(70000, defaultConfig)).toBe(1000);
  });

  it('should return 0 when revenue equals target', () => {
    expect(calculateContribution(50000, defaultConfig)).toBe(0);
  });

  it('should return 0 when revenue is below target', () => {
    expect(calculateContribution(30000, defaultConfig)).toBe(0);
  });

  it('should return 0 when revenue is 0', () => {
    expect(calculateContribution(0, defaultConfig)).toBe(0);
  });

  it('should handle different bonus percentages', () => {
    const config3 = { ...defaultConfig, bonusPercentage: 3 };
    // 20000 surplus * 3% = 600
    expect(calculateContribution(70000, config3)).toBe(600);
  });

  it('should handle large surplus correctly', () => {
    // 200000 - 50000 = 150000 surplus, 5% = 7500
    expect(calculateContribution(200000, defaultConfig)).toBe(7500);
  });

  it('should handle fractional contributions', () => {
    const config = { ...defaultConfig, bonusPercentage: 3 };
    // 50001 - 50000 = 1 surplus, 3% = 0.03
    expect(calculateContribution(50001, config)).toBe(0.03);
  });
});

describe('REQ-015: Payout Split Calculation', () => {
  it('should split 50/50 with default config', () => {
    const result = calculatePayouts(10000, defaultConfig);
    expect(result.kitchenPayout).toBe(5000);
    expect(result.barPayout).toBe(5000);
  });

  it('should calculate per-person amounts', () => {
    const result = calculatePayouts(10000, defaultConfig);
    // 5000 / 2 staff = 2500 per person
    expect(result.kitchenPerPerson).toBe(2500);
    expect(result.barPerPerson).toBe(2500);
  });

  it('should handle uneven split', () => {
    const config = {
      ...defaultConfig,
      kitchenSplitRatio: 60,
      barSplitRatio: 40,
    };
    const result = calculatePayouts(10000, config);
    expect(result.kitchenPayout).toBe(6000);
    expect(result.barPayout).toBe(4000);
  });

  it('should handle different staff counts', () => {
    const config = {
      ...defaultConfig,
      kitchenStaffCount: 3,
      barStaffCount: 1,
    };
    const result = calculatePayouts(10000, config);
    // Kitchen: 5000 / 3 = 1666.67
    expect(result.kitchenPerPerson).toBe(1666.67);
    // Bar: 5000 / 1 = 5000
    expect(result.barPerPerson).toBe(5000);
  });

  it('should handle 0 staff count gracefully', () => {
    const config = {
      ...defaultConfig,
      kitchenStaffCount: 0,
      barStaffCount: 2,
    };
    const result = calculatePayouts(10000, config);
    expect(result.kitchenPerPerson).toBe(0);
    expect(result.barPerPerson).toBe(2500);
  });

  it('should handle 0 pot', () => {
    const result = calculatePayouts(0, defaultConfig);
    expect(result.kitchenPayout).toBe(0);
    expect(result.barPayout).toBe(0);
    expect(result.kitchenPerPerson).toBe(0);
    expect(result.barPerPerson).toBe(0);
  });
});

describe('REQ-015: Monthly Scenario — Issue Example', () => {
  it('should match the example: ₦70k/day over 25 days', () => {
    // Daily: 70000 - 50000 = 20000 surplus, 5% = 1000
    const dailyContribution = calculateContribution(70000, defaultConfig);
    expect(dailyContribution).toBe(1000);

    // 25 qualifying days
    const totalPot = dailyContribution * 25;
    expect(totalPot).toBe(25000);

    // Split 50/50 between 2+2 staff = 4 people
    const result = calculatePayouts(totalPot, defaultConfig);
    expect(result.kitchenPayout).toBe(12500);
    expect(result.barPayout).toBe(12500);
    expect(result.kitchenPerPerson).toBe(6250);
    expect(result.barPerPerson).toBe(6250);
  });
});
