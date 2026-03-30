/**
 * @requirement REQ-018 - Inventory loss deduction calculation
 */
import { describe, it, expect } from 'vitest';

interface StaffPotConfig {
  dailyTarget: number;
  bonusPercentage: number;
  kitchenSplitRatio: number;
  barSplitRatio: number;
  kitchenStaffCount: number;
  barStaffCount: number;
  inventoryLossEnabled: boolean;
  foodLossThreshold: number;
  drinkLossThreshold: number;
}

interface InventoryLossData {
  foodLossPercent: number;
  drinkLossPercent: number;
  foodInventoryValue: number;
  drinkInventoryValue: number;
  foodDeduction: number;
  drinkDeduction: number;
}

function calculateDeductions(
  kitchenPot: number,
  barPot: number,
  loss: InventoryLossData,
  config: StaffPotConfig
): {
  kitchenDeduction: number;
  barDeduction: number;
  adjustedKitchenPot: number;
  adjustedBarPot: number;
} {
  if (!config.inventoryLossEnabled) {
    return {
      kitchenDeduction: 0,
      barDeduction: 0,
      adjustedKitchenPot: kitchenPot,
      adjustedBarPot: barPot,
    };
  }

  const kitchenDeduction = Math.min(loss.foodDeduction, kitchenPot);
  const barDeduction = Math.min(loss.drinkDeduction, barPot);

  return {
    kitchenDeduction: Math.round(kitchenDeduction * 100) / 100,
    barDeduction: Math.round(barDeduction * 100) / 100,
    adjustedKitchenPot: Math.round((kitchenPot - kitchenDeduction) * 100) / 100,
    adjustedBarPot: Math.round((barPot - barDeduction) * 100) / 100,
  };
}

function calculateExcessLoss(
  actualLossPercent: number,
  threshold: number,
  inventoryValue: number
): number {
  const excess = Math.max(0, actualLossPercent - threshold);
  return Math.round((excess / 100) * inventoryValue * 100) / 100;
}

const defaultConfig: StaffPotConfig = {
  dailyTarget: 50000,
  bonusPercentage: 5,
  kitchenSplitRatio: 50,
  barSplitRatio: 50,
  kitchenStaffCount: 2,
  barStaffCount: 2,
  inventoryLossEnabled: true,
  foodLossThreshold: 2,
  drinkLossThreshold: 3,
};

describe('REQ-018: No deduction when feature is disabled', () => {
  it('should return 0 deductions when inventoryLossEnabled is false', () => {
    const config = { ...defaultConfig, inventoryLossEnabled: false };
    const loss: InventoryLossData = {
      foodLossPercent: 5,
      drinkLossPercent: 6,
      foodInventoryValue: 200000,
      drinkInventoryValue: 300000,
      foodDeduction: 6000,
      drinkDeduction: 9000,
    };

    const result = calculateDeductions(12500, 12500, loss, config);
    expect(result.kitchenDeduction).toBe(0);
    expect(result.barDeduction).toBe(0);
    expect(result.adjustedKitchenPot).toBe(12500);
    expect(result.adjustedBarPot).toBe(12500);
  });
});

describe('REQ-018: No deduction when loss is below threshold', () => {
  it('should not deduct when food loss is below threshold', () => {
    const deduction = calculateExcessLoss(1, 2, 200000);
    expect(deduction).toBe(0);
  });

  it('should not deduct when loss equals threshold', () => {
    const deduction = calculateExcessLoss(2, 2, 200000);
    expect(deduction).toBe(0);
  });
});

describe('REQ-018: Deduction when loss exceeds threshold', () => {
  it('should deduct excess percentage from inventory value', () => {
    // 4% loss, 2% threshold → 2% excess on ₦200,000 = ₦4,000
    const deduction = calculateExcessLoss(4, 2, 200000);
    expect(deduction).toBe(4000);
  });

  it('should match the issue example', () => {
    // Food: 4% loss, 2% threshold, ₦200,000 inventory
    const foodDeduction = calculateExcessLoss(4, 2, 200000);
    expect(foodDeduction).toBe(4000);

    // Kitchen pot ₦12,500 - ₦4,000 = ₦8,500
    const result = calculateDeductions(
      12500,
      12500,
      {
        foodLossPercent: 4,
        drinkLossPercent: 2,
        foodInventoryValue: 200000,
        drinkInventoryValue: 300000,
        foodDeduction: 4000,
        drinkDeduction: 0,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(4000);
    expect(result.adjustedKitchenPot).toBe(8500);
    expect(result.barDeduction).toBe(0);
    expect(result.adjustedBarPot).toBe(12500);
  });
});

describe('REQ-018: Food loss deducts from kitchen only', () => {
  it('should not affect bar pot when only food loss exceeds threshold', () => {
    const result = calculateDeductions(
      10000,
      10000,
      {
        foodLossPercent: 5,
        drinkLossPercent: 1,
        foodInventoryValue: 200000,
        drinkInventoryValue: 300000,
        foodDeduction: 6000,
        drinkDeduction: 0,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(6000);
    expect(result.barDeduction).toBe(0);
  });
});

describe('REQ-018: Drink loss deducts from bar only', () => {
  it('should not affect kitchen pot when only drink loss exceeds threshold', () => {
    const result = calculateDeductions(
      10000,
      10000,
      {
        foodLossPercent: 1,
        drinkLossPercent: 6,
        foodInventoryValue: 200000,
        drinkInventoryValue: 300000,
        foodDeduction: 0,
        drinkDeduction: 9000,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(0);
    expect(result.barDeduction).toBe(9000);
  });
});

describe('REQ-018: Both categories exceed thresholds', () => {
  it('should deduct from both pots independently', () => {
    const result = calculateDeductions(
      12500,
      12500,
      {
        foodLossPercent: 5,
        drinkLossPercent: 7,
        foodInventoryValue: 200000,
        drinkInventoryValue: 300000,
        foodDeduction: 6000,
        drinkDeduction: 12000,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(6000);
    expect(result.barDeduction).toBe(12000);
    expect(result.adjustedKitchenPot).toBe(6500);
    expect(result.adjustedBarPot).toBe(500);
  });
});

describe('REQ-018: Deduction capped at pot amount', () => {
  it('should not make pot negative', () => {
    const result = calculateDeductions(
      3000,
      2000,
      {
        foodLossPercent: 10,
        drinkLossPercent: 10,
        foodInventoryValue: 500000,
        drinkInventoryValue: 500000,
        foodDeduction: 40000,
        drinkDeduction: 35000,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(3000); // capped at pot
    expect(result.barDeduction).toBe(2000); // capped at pot
    expect(result.adjustedKitchenPot).toBe(0);
    expect(result.adjustedBarPot).toBe(0);
  });
});

describe('REQ-018: No deduction when no snapshots', () => {
  it('should return 0 deductions with 0% loss', () => {
    const result = calculateDeductions(
      12500,
      12500,
      {
        foodLossPercent: 0,
        drinkLossPercent: 0,
        foodInventoryValue: 0,
        drinkInventoryValue: 0,
        foodDeduction: 0,
        drinkDeduction: 0,
      },
      defaultConfig
    );
    expect(result.kitchenDeduction).toBe(0);
    expect(result.barDeduction).toBe(0);
  });
});

describe('REQ-018: Loss uses negative discrepancies only', () => {
  it('should calculate excess from actual loss percent (positive surplus ignored)', () => {
    // If surplus items exist, they don't reduce the loss %
    // Loss % is already calculated from negative discrepancies only in the service
    // This test verifies the deduction formula handles the resulting %
    const deduction = calculateExcessLoss(3, 2, 100000);
    expect(deduction).toBe(1000); // 1% excess on ₦100,000
  });
});

describe('REQ-018: Per-person bonus reflects deduction', () => {
  it('should calculate per-person from adjusted pot', () => {
    const result = calculateDeductions(
      10000,
      10000,
      {
        foodLossPercent: 4,
        drinkLossPercent: 1,
        foodInventoryValue: 200000,
        drinkInventoryValue: 300000,
        foodDeduction: 4000,
        drinkDeduction: 0,
      },
      defaultConfig
    );

    const kitchenPerPerson = result.adjustedKitchenPot / 2;
    const barPerPerson = result.adjustedBarPot / 2;
    expect(kitchenPerPerson).toBe(3000); // (10000 - 4000) / 2
    expect(barPerPerson).toBe(5000); // 10000 / 2
  });
});
