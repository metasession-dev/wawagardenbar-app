import 'tsconfig-paths/register';
import { randomUUID } from 'node:crypto';
import type { HydratedDocument } from 'mongoose';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from './db-setup';
import { UserModel, MenuItemModel, InventoryModel, OrderModel } from '@/models';
import TabModel from '@/models/tab-model';
import { AdminService } from '@/services/admin-service';
import type { IUser, IMenuItem, OrderStatus, OrderType } from '@/interfaces';

type UserDoc = HydratedDocument<IUser>;
type MenuItemDoc = HydratedDocument<IMenuItem>;

interface SeedUsersResult {
  customer: UserDoc;
  admin: UserDoc;
  superAdmin: UserDoc;
}

async function seedTestUsers(): Promise<SeedUsersResult> {
  const [adminPassword, superAdminPassword] = await Promise.all([
    AdminService.hashPassword('admin123'),
    AdminService.hashPassword('superadmin123'),
  ]);

  const customer = await UserModel.create({
    firstName: 'Test',
    lastName: 'Customer',
    email: 'customer@test.com',
    phone: '+2348000000001',
    role: 'customer',
    isAdmin: false,
    emailVerified: true,
    phoneVerified: true,
    accountStatus: 'active',
  });

  const admin = await UserModel.create({
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.com',
    phone: '+2348000000002',
    role: 'admin',
    isAdmin: true,
    username: 'admin',
    password: adminPassword,
    emailVerified: true,
    phoneVerified: true,
    accountStatus: 'active',
  });

  const superAdmin = await UserModel.create({
    firstName: 'Test',
    lastName: 'Super',
    email: 'superadmin@test.com',
    phone: '+2348000000003',
    role: 'super-admin',
    isAdmin: true,
    username: 'superadmin',
    password: superAdminPassword,
    emailVerified: true,
    phoneVerified: true,
    accountStatus: 'active',
  });

  return {
    customer,
    admin,
    superAdmin,
  };
}

type SeedMenuItem = Pick<
  IMenuItem,
  | 'name'
  | 'description'
  | 'mainCategory'
  | 'category'
  | 'price'
  | 'images'
  | 'customizations'
  | 'isAvailable'
  | 'preparationTime'
  | 'servingSize'
  | 'tags'
  | 'allergens'
  | 'slug'
  | 'trackInventory'
  | 'pointsValue'
  | 'pointsRedeemable'
>;

async function seedTestMenuItems(): Promise<MenuItemDoc[]> {
  const menuItems: SeedMenuItem[] = [
    {
      name: 'Jollof Rice',
      description: 'Traditional Nigerian jollof rice served with plantain.',
      mainCategory: 'food',
      category: 'main-courses',
      price: 2500,
      images: ['/uploads/menu/jollof-rice.jpg'],
      customizations: [],
      isAvailable: true,
      preparationTime: 20,
      servingSize: '1 plate',
      tags: ['rice', 'spicy'],
      allergens: [],
      slug: 'jollof-rice',
      trackInventory: true,
      pointsValue: 50,
      pointsRedeemable: true,
    },
    {
      name: 'Chicken Wings',
      description: 'Crispy chicken wings tossed in signature sauce.',
      mainCategory: 'food',
      category: 'starters',
      price: 1500,
      images: ['/uploads/menu/chicken-wings.jpg'],
      customizations: [],
      isAvailable: true,
      preparationTime: 15,
      servingSize: '6 pieces',
      tags: ['chicken'],
      allergens: ['chicken'],
      slug: 'chicken-wings',
      trackInventory: true,
      pointsValue: 30,
      pointsRedeemable: true,
    },
    {
      name: 'Star Beer',
      description: 'Chilled local favorite beer.',
      mainCategory: 'drinks',
      category: 'beer-local',
      price: 800,
      images: ['/uploads/menu/star-beer.jpg'],
      customizations: [],
      isAvailable: true,
      preparationTime: 2,
      tags: ['beer'],
      allergens: [],
      slug: 'star-beer',
      trackInventory: true,
      pointsValue: 10,
      pointsRedeemable: false,
    },
    {
      name: 'Chapman',
      description: 'Refreshing Nigerian Chapman cocktail.',
      mainCategory: 'drinks',
      category: 'soft-drinks',
      price: 1200,
      images: ['/uploads/menu/chapman.jpg'],
      customizations: [],
      isAvailable: true,
      preparationTime: 5,
      tags: ['cocktail'],
      allergens: [],
      slug: 'chapman',
      trackInventory: false,
      pointsValue: 15,
      pointsRedeemable: true,
    },
  ];

  const createdItems = await MenuItemModel.insertMany(menuItems);

  await InventoryModel.insertMany(
    createdItems.map((item) => ({
      menuItemId: item._id,
      currentStock: 150,
      minimumStock: 10,
      maximumStock: 200,
      unit: item.mainCategory === 'drinks' ? 'bottles' : 'portions',
      costPerUnit: item.price * 0.4,
      status: 'in-stock',
      preventOrdersWhenOutOfStock: false,
    }))
  );

  return createdItems as MenuItemDoc[];
}

async function seedTestOrders(
  users: SeedUsersResult,
  menuItems: MenuItemDoc[]
): Promise<void> {
  const [jollof, chickenWings, beer, chapman] = menuItems;

  const buildItems = (
    itemConfigs: Array<{ menuItem: MenuItemDoc; quantity: number; instructions?: string }>
  ) =>
    itemConfigs.map(({ menuItem, quantity, instructions }) => ({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      customizations: [],
      specialInstructions: instructions,
      subtotal: menuItem.price * quantity,
    }));

  const createOrderData = (
    config: {
      orderNumber: string;
      status: OrderStatus;
      orderType: OrderType;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      tableNumber?: string;
      pickupOffsetMinutes?: number;
      deliveryCity?: string;
      deliveryState?: string;
      deliveryCountry?: string;
      paymentStatus?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    },
    items: ReturnType<typeof buildItems>,
    expenses?: { deliveryFee?: number; serviceFee?: number; tipAmount?: number }
  ) => {
    const deliveryFee = expenses?.deliveryFee ?? 0;
    const serviceFee = expenses?.serviceFee ?? 0;
    const tipAmount = expenses?.tipAmount ?? 0;
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + deliveryFee + serviceFee + tipAmount;
    const pickupDetails =
      config.orderType === 'pickup'
        ? {
            preferredPickupTime: new Date(Date.now() + (config.pickupOffsetMinutes ?? 30) * 60 * 1000),
          }
        : undefined;
    const dineInDetails =
      config.orderType === 'dine-in'
        ? {
            tableNumber: config.tableNumber ?? '10',
            qrCodeScanned: true,
          }
        : undefined;
    const deliveryDetails =
      config.orderType === 'delivery'
        ? {
            address: {
              street: '42 Admiralty Way',
              street2: 'Suite 9B',
              city: config.deliveryCity ?? 'Lagos',
              state: config.deliveryState ?? 'Lagos',
              postalCode: '100001',
              country: config.deliveryCountry ?? 'Nigeria',
            },
            deliveryInstructions: 'Call when outside',
          }
        : undefined;

    return {
      orderNumber: config.orderNumber,
      idempotencyKey: randomUUID(),
      userId: users.customer._id,
      guestName: config.guestName,
      guestEmail: config.guestEmail,
      guestPhone: config.guestPhone,
      orderType: config.orderType,
      status: config.status,
      items,
      subtotal,
      serviceFee,
      tax: 0,
      deliveryFee,
      discount: 0,
      tipAmount,
      total,
      paymentStatus: config.paymentStatus ?? 'paid',
      estimatedWaitTime: 20,
      pickupDetails,
      dineInDetails,
      deliveryDetails,
    };
  };

  const kitchenOrders = [
    createOrderData(
      {
        orderNumber: 'ORD-PENDING-2001',
        status: 'pending',
        orderType: 'pickup',
        guestName: 'Ada Pending',
        guestEmail: 'ada.pending@test.com',
        pickupOffsetMinutes: 25,
      },
      buildItems([
        { menuItem: jollof, quantity: 1, instructions: 'Extra spicy' },
        { menuItem: beer, quantity: 2 },
      ])
    ),
    createOrderData(
      {
        orderNumber: 'ORD-CONFIRMED-2002',
        status: 'confirmed',
        orderType: 'dine-in',
        tableNumber: '18',
        guestName: 'Kunle Confirmed',
      },
      buildItems([
        { menuItem: chickenWings, quantity: 2 },
        { menuItem: chapman, quantity: 1 },
      ]),
      { serviceFee: 200 }
    ),
    createOrderData(
      {
        orderNumber: 'ORD-PREPARING-2003',
        status: 'preparing',
        orderType: 'delivery',
        deliveryCity: 'Lekki',
        deliveryState: 'Lagos',
        guestName: 'Ngozi Preparing',
      },
      buildItems([
        { menuItem: jollof, quantity: 1 },
        { menuItem: chickenWings, quantity: 1 },
      ]),
      { deliveryFee: 1000 }
    ),
    createOrderData(
      {
        orderNumber: 'ORD-READY-2004',
        status: 'ready',
        orderType: 'dine-in',
        tableNumber: '7',
      },
      buildItems([
        { menuItem: jollof, quantity: 1 },
        { menuItem: chapman, quantity: 2 },
      ])
    ),
    createOrderData(
      {
        orderNumber: 'ORD-COMPLETED-2005',
        status: 'completed',
        orderType: 'delivery',
        deliveryCity: 'Victoria Island',
        deliveryState: 'Lagos',
        guestName: 'Bayo Completed',
      },
      buildItems([
        { menuItem: jollof, quantity: 1 },
        { menuItem: chickenWings, quantity: 1 },
      ]),
      { deliveryFee: 800 }
    ),
    createOrderData(
      {
        orderNumber: 'ORD-PENDING-2100',
        status: 'pending',
        orderType: 'dine-in',
        guestName: 'Test Workflow',
        guestEmail: 'workflow@test.com',
        tableNumber: '15',
        paymentStatus: 'paid',
      },
      buildItems([{ menuItem: chickenWings, quantity: 1 }])
    ),
  ];

  await OrderModel.insertMany(kitchenOrders);
  await seedTestTabs(users, menuItems);
}

async function seedTestTabs(users: SeedUsersResult, menuItems: MenuItemDoc[]): Promise<void> {
  const [jollof, chickenWings, beer] = menuItems;

  const createItems = (
    configs: Array<{ menuItem: MenuItemDoc; quantity: number; instructions?: string }>
  ) =>
    configs.map(({ menuItem, quantity, instructions }) => ({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      customizations: [],
      specialInstructions: instructions,
      subtotal: menuItem.price * quantity,
    }));

  const calculateTotals = (
    items: ReturnType<typeof createItems>,
    serviceFee: number = 0,
    tax: number = 0,
    tipAmount: number = 0
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + serviceFee + tax + tipAmount;
    return { subtotal, total };
  };

  const openTab = await TabModel.create({
    tabNumber: 'TAB-2101',
    tableNumber: '21',
    userId: users.customer._id,
    customerName: 'Grace Ike',
    customerEmail: 'grace+tab1@test.com',
    status: 'open',
    subtotal: 0,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    total: 0,
    orders: [],
  });

  const openTabItems = createItems([
    { menuItem: jollof, quantity: 1 },
    { menuItem: beer, quantity: 2 },
  ]);
  const openTabTotals = calculateTotals(openTabItems);

  const openTabOrder = await OrderModel.create({
    orderNumber: 'ORD-TAB-2101',
    idempotencyKey: randomUUID(),
    userId: users.customer._id,
    orderType: 'dine-in',
    status: 'confirmed',
    tabId: openTab._id,
    items: openTabItems,
    subtotal: openTabTotals.subtotal,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    tipAmount: 0,
    total: openTabTotals.total,
    paymentStatus: 'pending',
    estimatedWaitTime: 15,
    dineInDetails: {
      tableNumber: '21',
      qrCodeScanned: false,
    },
  });

  openTab.orders = [openTabOrder._id];
  openTab.subtotal = openTabTotals.subtotal;
  openTab.total = openTabTotals.total;
  await openTab.save();

  const settlingTab = await TabModel.create({
    tabNumber: 'TAB-2102',
    tableNumber: '14',
    status: 'settling',
    userId: users.customer._id,
    customerName: 'Ife Settling',
    customerEmail: 'ife+tab@test.com',
    subtotal: 0,
    serviceFee: 200,
    tax: 0,
    discountTotal: 0,
    tipAmount: 0,
    total: 0,
    paymentStatus: 'pending',
    orders: [],
  });

  const settlingItems = createItems([
    { menuItem: chickenWings, quantity: 2 },
    { menuItem: beer, quantity: 1 },
  ]);
  const settlingTotals = calculateTotals(settlingItems, settlingTab.serviceFee);

  const settlingOrder = await OrderModel.create({
    orderNumber: 'ORD-TAB-2102',
    idempotencyKey: randomUUID(),
    orderType: 'dine-in',
    status: 'ready',
    tabId: settlingTab._id,
    items: settlingItems,
    subtotal: settlingTotals.subtotal,
    serviceFee: settlingTab.serviceFee,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    tipAmount: 0,
    total: settlingTotals.total,
    paymentStatus: 'pending',
    estimatedWaitTime: 10,
    dineInDetails: {
      tableNumber: '14',
      qrCodeScanned: true,
    },
  });

  settlingTab.orders = [settlingOrder._id];
  settlingTab.subtotal = settlingTotals.subtotal;
  settlingTab.total = settlingTotals.total;
  await settlingTab.save();

  const closedTab = await TabModel.create({
    tabNumber: 'TAB-2103',
    tableNumber: '5',
    status: 'closed',
    userId: users.customer._id,
    customerName: 'Lanre Closed',
    customerEmail: 'lanre+tab@test.com',
    subtotal: 0,
    serviceFee: 150,
    tax: 0,
    discountTotal: 0,
    tipAmount: 200,
    total: 0,
    paymentStatus: 'paid',
    closedAt: new Date(),
    orders: [],
  });

  const closedItems = createItems([
    { menuItem: jollof, quantity: 1 },
    { menuItem: chickenWings, quantity: 1 },
  ]);
  const closedTotals = calculateTotals(closedItems, closedTab.serviceFee, 0, closedTab.tipAmount);

  const closedOrder = await OrderModel.create({
    orderNumber: 'ORD-TAB-2103',
    idempotencyKey: randomUUID(),
    orderType: 'dine-in',
    status: 'completed',
    tabId: closedTab._id,
    items: closedItems,
    subtotal: closedTotals.subtotal,
    serviceFee: closedTab.serviceFee,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    tipAmount: closedTab.tipAmount,
    total: closedTotals.total,
    paymentStatus: 'paid',
    estimatedWaitTime: 10,
    dineInDetails: {
      tableNumber: '5',
      qrCodeScanned: true,
    },
    paidAt: new Date(),
  });

  closedTab.orders = [closedOrder._id];
  closedTab.subtotal = closedTotals.subtotal;
  closedTab.total = closedTotals.total;
  await closedTab.save();
}

export async function seedAllTestData(): Promise<void> {
  await setupTestDatabase();
  await cleanupTestDatabase();

  const users = await seedTestUsers();
  const menuItems = await seedTestMenuItems();
  await seedTestOrders(users, menuItems);

  await closeTestDatabase();
  console.log('✅ Test database seeded successfully');
}

if (process.argv[1]?.includes('seed-test-data.ts')) {
  seedAllTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error('❌ Failed to seed test data', error);
      process.exit(1);
    });
}
