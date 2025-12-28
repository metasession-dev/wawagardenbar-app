import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { OrderStatus } from '@/interfaces';

// Use global to persist socket instance across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var socketIO: SocketIOServer | undefined;
}

let io: SocketIOServer | null = globalThis.socketIO || null;

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('Socket.IO already initialized, reusing instance');
    return io;
  }

  console.log('Initializing new Socket.IO server instance...');
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  // Store in global for persistence
  globalThis.socketIO = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join order-specific room
    socket.on('join-order', (orderId: string) => {
      socket.join(`order-${orderId}`);
      console.log(`Client ${socket.id} joined order room: ${orderId}`);
    });

    // Leave order-specific room
    socket.on('leave-order', (orderId: string) => {
      socket.leave(`order-${orderId}`);
      console.log(`Client ${socket.id} left order room: ${orderId}`);
    });

    // Join kitchen dashboard room (for staff)
    socket.on('join-kitchen', () => {
      socket.join('kitchen');
      console.log(`Client ${socket.id} joined kitchen room`);
    });

    // Leave kitchen dashboard room
    socket.on('leave-kitchen', () => {
      socket.leave('kitchen');
      console.log(`Client ${socket.id} left kitchen room`);
    });

    // Join orders dashboard room (for admin)
    socket.on('orders:subscribe', () => {
      socket.join('orders');
      console.log(`Client ${socket.id} joined orders room`);
    });

    // Leave orders dashboard room
    socket.on('orders:unsubscribe', () => {
      socket.leave('orders');
      console.log(`Client ${socket.id} left orders room`);
    });

    // Join kitchen display room
    socket.on('kitchen:subscribe', () => {
      socket.join('kitchen-display');
      console.log(`Client ${socket.id} joined kitchen-display room`);
    });

    // Leave kitchen display room
    socket.on('kitchen:unsubscribe', () => {
      socket.leave('kitchen-display');
      console.log(`Client ${socket.id} left kitchen-display room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  // Check both module variable and global
  if (!io && globalThis.socketIO) {
    io = globalThis.socketIO;
  }
  return io;
}

/**
 * Emit order status update to specific order room
 */
export function emitOrderStatusUpdate(
  orderId: string,
  status: OrderStatus,
  estimatedWaitTime?: number,
  note?: string
): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  socketServer.to(`order-${orderId}`).emit('order-status-update', {
    orderId,
    status,
    estimatedWaitTime,
    note,
    timestamp: new Date().toISOString(),
  });

  console.log(`Emitted status update for order ${orderId}: ${status}`);
}

/**
 * Emit new order notification to kitchen
 */
export function emitNewOrder({
  orderId,
  orderNumber,
  orderType,
  itemCount,
  total,
  items,
  customer,
  status,
  createdAt,
}: {
  orderId: string;
  orderNumber: string;
  orderType: string;
  itemCount: number;
  total: number;
  items: any[];
  customer: { name: string; email?: string; phone?: string };
  status: string;
  createdAt: string;
}): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  socketServer.to('kitchen-display').emit('kitchen:new-order', {
    _id: orderId, // KitchenOrderGrid expects _id
    orderId,
    orderNumber,
    orderType,
    itemCount,
    total,
    items,
    customer,
    status,
    createdAt,
    timestamp: new Date().toISOString(),
  });

  console.log(`Emitted new order to kitchen: ${orderNumber}`);
}

/**
 * Emit order update to kitchen
 */
export function emitOrderChange({
  orderId,
  status,
  action,
}: {
  orderId: string;
  status: OrderStatus;
  action: 'updated' | 'cancelled';
}): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  // KitchenOrderGrid listens for 'order:updated' on 'kitchen-display' room
  socketServer.to('kitchen-display').emit('order:updated', {
    orderId,
    status,
    action,
    timestamp: new Date().toISOString(),
  });

  console.log(`Emitted order update to kitchen: ${orderId}`);
}

/**
 * Emit order created event
 */
export function emitOrderCreated(order: any): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  socketServer.to('orders').emit('order:created', order);
  socketServer.to('kitchen-display').emit('order:created', order);

  console.log(`Emitted order created: ${order.orderNumber}`);
}

/**
 * Emit order updated event
 */
export function emitOrderUpdated({
  orderId,
  updates,
  action,
  status,
  updatedBy,
}: {
  orderId: string;
  updates: any;
  action: string;
  status: string;
  updatedBy?: string;
}): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  const data = { orderId, updates, action, status, updatedBy, timestamp: new Date().toISOString() };

  socketServer.to('orders').emit('order:updated', data);
  socketServer.to('kitchen-display').emit('order:updated', data);

  console.log(`Emitted order updated: ${data.orderId}`);
}

/**
 * Emit order cancelled event
 */
export function emitOrderCancelled({
  orderId,
  reason,
}: {
  orderId: string;
  reason: string;
}): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  const data = { orderId, reason, timestamp: new Date().toISOString() };

  socketServer.to('orders').emit('order:cancelled', data);
  socketServer.to('kitchen-display').emit('order:cancelled', data);

  console.log(`Emitted order cancelled: ${data.orderId}`);
}

/**
 * Emit batch update event
 */
export function emitBatchUpdate({
  orderIds,
  action,
}: {
  orderIds: string[];
  action: string;
}): void {
  const socketServer = getSocketServer();
  if (!socketServer) {
    console.warn('Socket.IO server not initialized - cannot emit batch update');
    console.warn('Make sure the server is running with: npm run dev');
    return;
  }

  console.log(`📡 Emitting batch update to kitchen: ${orderIds.length} orders, action: ${action}`);
  socketServer.to('kitchen').emit('batch-update', {
    orderIds,
    action,
    timestamp: new Date().toISOString(),
  });
}
