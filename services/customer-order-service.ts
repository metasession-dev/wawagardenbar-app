/**
 * @requirement REQ-120 - Single customer order service; tabs staff-only (WA-05)
 *
 * The only way a customer order is created. Every customer entry point (web
 * checkout, public API with a customer-scoped key, and later the WhatsApp
 * link) calls `createCustomerOrder`; callers only translate their input and
 * map the typed error. Staff order creation (Express, tabs, staff API keys)
 * does not go through here (ADR-010).
 *
 * The server is the only source of money: prices come from the menu
 * (including customization option prices), fees from `SettingsService`, and
 * any total supplied by a client is never read.
 */

import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order-model';
import MenuItemModel from '@/models/menu-item-model';
import type {
  IOrder,
  OrderChannel,
  PortionSize,
} from '@/interfaces/order.interface';
import {
  reconcileAndValidateOrderLines,
  type MenuItemForReconcile,
} from '@/lib/order-line-totals';
import type { SelectedCustomization } from '@/lib/customization-validation';
import { computeLineTotal } from '@/lib/cart-line-math';
import { geocodeAddress } from '@/lib/geo/geocode';
import { OrderService } from './order-service';
import SettingsService from './settings-service';

export type CustomerOrderType = 'dine-in' | 'pickup' | 'delivery';

export type CustomerOrderErrorCode =
  | 'OUT_OF_HOURS'
  | 'BELOW_MINIMUM'
  | 'ITEM_UNAVAILABLE'
  | 'OUT_OF_RADIUS'
  | 'ORDER_TYPE_DISABLED'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'NOT_ALLOWED';

export interface CustomerOrderLineInput {
  menuItemId: string;
  quantity: number;
  /** 1 (full), 0.5 (half) or 0.25 (quarter). Defaults to 1. */
  portionMultiplier?: number;
  specialInstructions?: string;
  /** Only `name` (group) and `option` are read; the price comes from the menu. */
  customizations?: Array<{ name: string; option: string }>;
}

export interface CustomerOrderInput {
  orderType: CustomerOrderType;
  items: CustomerOrderLineInput[];
  idempotencyKey: string;
  tableNumber?: string;
  /** ISO date-time. Pickup only; defaults to the next open slot. */
  pickupTime?: string;
  deliveryAddress?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  deliveryInstructions?: string;
  customerLat?: number;
  customerLng?: number;
  specialInstructions?: string;
  tipAmount?: number;
  tipPaymentMethod?: IOrder['tipPaymentMethod'];
}

export interface CustomerOrderContext {
  userId: string;
  channel: Exclude<OrderChannel, 'staff_dashboard'>;
}

export type CustomerOrderResult =
  | { success: true; order: IOrder; reused: boolean }
  | { success: false; code: CustomerOrderErrorCode; message: string };

const CUSTOMER_ORDER_TYPES: readonly string[] = [
  'dine-in',
  'pickup',
  'delivery',
];

function fail(
  code: CustomerOrderErrorCode,
  message: string
): CustomerOrderResult {
  return { success: false, code, message };
}

function portionSizeFor(multiplier: number): PortionSize {
  if (multiplier === 0.5) return 'half';
  if (multiplier === 0.25) return 'quarter';
  return 'full';
}

async function findByIdempotencyKey(
  key: string,
  userId: string
): Promise<CustomerOrderResult | null> {
  const existing = await Order.findOne({ idempotencyKey: key });
  if (!existing) return null;
  // A key belonging to someone else must not reveal or return their order.
  if (existing.userId?.toString() !== userId) {
    return fail('NOT_ALLOWED', 'Idempotency key already in use');
  }
  return { success: true, order: existing.toObject(), reused: true };
}

export async function createCustomerOrder(
  input: CustomerOrderInput,
  ctx: CustomerOrderContext
): Promise<CustomerOrderResult> {
  // --- Shape checks: no guests, no staff-only types, no tabs -------------
  if (!ctx?.userId || !Types.ObjectId.isValid(ctx.userId)) {
    return fail('NOT_ALLOWED', 'A signed-in customer is required');
  }
  const loose = input as unknown as Record<string, unknown>;
  if (loose.tabId || loose.useTab) {
    return fail('NOT_ALLOWED', 'Customers cannot create or use tabs');
  }
  if (!CUSTOMER_ORDER_TYPES.includes(input.orderType)) {
    return fail(
      'INVALID_INPUT',
      'orderType must be dine-in, pickup or delivery'
    );
  }
  if (!input.idempotencyKey || typeof input.idempotencyKey !== 'string') {
    return fail('IDEMPOTENCY_KEY_REQUIRED', 'idempotencyKey is required');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return fail('INVALID_INPUT', 'Order must contain at least one item');
  }
  for (const line of input.items) {
    if (
      !line ||
      !Types.ObjectId.isValid(line.menuItemId) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      return fail('INVALID_INPUT', 'Each item needs a valid id and quantity');
    }
  }
  const tipAmount = input.tipAmount ?? 0;
  if (!Number.isFinite(tipAmount) || tipAmount < 0) {
    return fail('INVALID_INPUT', 'tipAmount must be zero or more');
  }

  await connectDB();

  // --- Idempotency -------------------------------------------------------
  const repeated = await findByIdempotencyKey(input.idempotencyKey, ctx.userId);
  if (repeated) return repeated;

  // --- Settings-driven rules --------------------------------------------
  if (!(await SettingsService.isOrderTypeEnabled(input.orderType))) {
    return fail(
      'ORDER_TYPE_DISABLED',
      `${input.orderType} orders are disabled`
    );
  }

  // REQ-061: dine-in is implicitly inside hours (the customer is at the bar).
  if (input.orderType !== 'dine-in') {
    if (!(await SettingsService.isWithinBusinessHours())) {
      const next = await SettingsService.getNextOpenSlot();
      return fail('OUT_OF_HOURS', next.message);
    }
  }

  const settings = await SettingsService.getSettings();
  if (settings.maxOrdersPerHour > 0) {
    const recent = await Order.countDocuments({
      origin: 'customer',
      status: { $ne: 'cancelled' },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recent >= settings.maxOrdersPerHour) {
      return fail(
        'RATE_LIMITED',
        'We are at capacity right now. Please try again shortly.'
      );
    }
  }

  // --- Order-type details -----------------------------------------------
  let pickupAt: Date | undefined;
  let dineInTable: string | undefined;
  if (input.orderType === 'dine-in') {
    dineInTable = input.tableNumber?.trim();
    if (!dineInTable) {
      return fail('INVALID_INPUT', 'tableNumber is required for dine-in');
    }
  } else if (input.orderType === 'pickup') {
    if (input.pickupTime) {
      pickupAt = new Date(input.pickupTime);
      if (isNaN(pickupAt.getTime())) {
        return fail('INVALID_INPUT', 'pickupTime is not a valid date');
      }
    } else {
      const next = await SettingsService.getNextOpenSlot();
      pickupAt = next.openAt ?? new Date();
    }
  } else {
    const a = input.deliveryAddress;
    if (!a?.street?.trim() || !a.city?.trim() || !a.state?.trim()) {
      return fail('INVALID_INPUT', 'A full delivery address is required');
    }
    let lat = input.customerLat;
    let lng = input.customerLng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const coords = await geocodeAddress(
        [a.street, a.city, a.state, a.country].filter(Boolean).join(', ')
      );
      lat = coords?.lat;
      lng = coords?.lng;
    }
    // Fail-open when coordinates are unknown (REQ-061 posture).
    const distance = await SettingsService.checkDeliveryDistance(lat, lng);
    if (!distance.withinRadius) {
      return fail(
        'OUT_OF_RADIUS',
        `This address is ${distance.distanceKm} km away, outside our delivery radius.`
      );
    }
  }

  // --- Lines: the menu is the source of truth ---------------------------
  const menuItemIds = Array.from(new Set(input.items.map((i) => i.menuItemId)));
  const menuDocs = await MenuItemModel.find({
    _id: { $in: menuItemIds },
  }).lean();
  const menuMap = new Map<string, MenuItemForReconcile>();
  const availability = new Map<string, boolean>();
  for (const m of menuDocs as any[]) {
    const id = m._id.toString();
    availability.set(id, m.isAvailable !== false);
    menuMap.set(id, {
      _id: id,
      name: m.name,
      price: m.price,
      showPrice: m.showPrice,
      happyHourPrice: m.happyHourPrice,
      customizations: m.customizations,
      portionOptions: m.portionOptions,
    });
  }

  const resolvedLines: Array<{
    menuItemId: string;
    quantity: number;
    portionMultiplier: number;
    specialInstructions?: string;
    customizations: SelectedCustomization[];
  }> = [];
  for (const line of input.items) {
    const menu = menuMap.get(line.menuItemId);
    if (!menu) {
      return fail(
        'ITEM_UNAVAILABLE',
        'An item in your cart is no longer on the menu'
      );
    }
    if (availability.get(line.menuItemId) === false) {
      return fail('ITEM_UNAVAILABLE', `${menu.name} is currently unavailable`);
    }
    const multiplier = line.portionMultiplier ?? 1;
    if (![1, 0.5, 0.25].includes(multiplier)) {
      return fail('INVALID_INPUT', 'portionMultiplier must be 1, 0.5 or 0.25');
    }
    const customizations: SelectedCustomization[] = [];
    for (const sel of line.customizations ?? []) {
      const group = menu.customizations?.find((g) => g.name === sel.name);
      const option = group?.options?.find((o) => o.name === sel.option);
      if (!group || !option) {
        return fail(
          'INVALID_INPUT',
          `Unknown option "${sel.option}" for ${menu.name}`
        );
      }
      if (option.available === false) {
        return fail(
          'ITEM_UNAVAILABLE',
          `${sel.option} is currently unavailable for ${menu.name}`
        );
      }
      // Price comes from the menu, never from the request.
      customizations.push({
        name: sel.name,
        option: sel.option,
        price: typeof option.price === 'number' ? option.price : 0,
      });
    }
    resolvedLines.push({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      portionMultiplier: multiplier,
      specialInstructions: line.specialInstructions,
      customizations,
    });
  }

  const reconciled = await reconcileAndValidateOrderLines({
    menuItems: menuMap,
    lines: resolvedLines.map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      portionMultiplier: l.portionMultiplier,
      customizations: l.customizations,
    })),
  });
  if (!reconciled.valid) {
    return fail('INVALID_INPUT', reconciled.error);
  }
  const subtotal = reconciled.recomputedSubtotal;

  if (!(await SettingsService.meetsMinimumOrder(subtotal))) {
    return fail(
      'BELOW_MINIMUM',
      `The minimum order is ₦${settings.minimumOrderAmount.toLocaleString()}`
    );
  }

  const activePriceField = await SettingsService.resolveActivePriceField();
  const items = resolvedLines.map((l) => {
    const menu = menuMap.get(l.menuItemId)!;
    const base = menu[activePriceField] ?? menu.price;
    const surcharge =
      l.portionMultiplier === 0.5
        ? (menu.portionOptions?.halfPortionSurcharge ?? 0)
        : l.portionMultiplier === 0.25
          ? (menu.portionOptions?.quarterPortionSurcharge ?? 0)
          : 0;
    return {
      menuItemId: new Types.ObjectId(l.menuItemId),
      name: menu.name,
      price: Math.round(base * l.portionMultiplier) + surcharge,
      quantity: l.quantity,
      portionSize: portionSizeFor(l.portionMultiplier),
      portionMultiplier: l.portionMultiplier,
      customizations: l.customizations,
      specialInstructions: l.specialInstructions,
      subtotal: computeLineTotal({
        basePrice: base,
        customizations: l.customizations,
        quantity: l.quantity,
        portionMultiplier: l.portionMultiplier,
        portionSurcharge: surcharge,
      }),
      costPerUnit: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      priceOverridden: false,
    };
  });

  const totals = await SettingsService.calculateOrderTotals(
    subtotal,
    input.orderType
  );

  try {
    const order = await OrderService.createOrder({
      userId: ctx.userId,
      createdBy: ctx.userId,
      createdByRole: 'customer',
      origin: 'customer',
      channel: ctx.channel,
      idempotencyKey: input.idempotencyKey,
      orderType: input.orderType,
      items: items as unknown as IOrder['items'],
      subtotal,
      serviceFee: totals.serviceFee,
      tax: totals.tax,
      deliveryFee: totals.deliveryFee,
      discount: 0,
      tipAmount,
      ...(input.tipPaymentMethod
        ? { tipPaymentMethod: input.tipPaymentMethod }
        : {}),
      total: totals.total + tipAmount,
      specialInstructions: input.specialInstructions,
      ...(input.orderType === 'delivery' && input.deliveryAddress
        ? {
            deliveryDetails: {
              address: input.deliveryAddress,
              deliveryInstructions: input.deliveryInstructions,
            },
          }
        : {}),
      ...(pickupAt ? { pickupDetails: { preferredPickupTime: pickupAt } } : {}),
      ...(dineInTable
        ? { dineInDetails: { tableNumber: dineInTable, qrCodeScanned: false } }
        : {}),
    } as Parameters<typeof OrderService.createOrder>[0]);
    return { success: true, order, reused: false };
  } catch (error) {
    // Two requests with the same key raced past the lookup: return the winner.
    const e = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (e.code === 11000 && e.keyPattern?.idempotencyKey) {
      const winner = await findByIdempotencyKey(
        input.idempotencyKey,
        ctx.userId
      );
      if (winner) return winner;
    }
    throw error;
  }
}
