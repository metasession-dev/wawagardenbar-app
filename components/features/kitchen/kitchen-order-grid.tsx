'use client';

import { useEffect, useState, useRef } from 'react';
import { useOrderStore } from '@/stores/order-store';
import { KitchenOrderCard } from './kitchen-order-card';
import { subscribeToKitchen } from '@/lib/socket-client';
import { useRouter } from 'next/navigation';

interface KitchenOrderGridProps {
  initialOrders: any[];
}

/**
 * Kitchen order grid component
 * Real-time grid of active orders with auto-refresh
 * @requirement REQ-083 — terminal statuses remove from store instead of router.refresh() race
 */
export function KitchenOrderGrid({ initialOrders }: KitchenOrderGridProps) {
  const router = useRouter();
  const { orders, setOrders, addOrder, updateOrder, removeOrder } =
    useOrderStore();
  const [flashingOrder, setFlashingOrder] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize orders
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders, setOrders]);

  // Subscribe to kitchen Socket.io events
  useEffect(() => {
    const unsubscribe = subscribeToKitchen({
      onNewOrder: (order) => {
        addOrder(order);
        setFlashingOrder(order._id);
        playNewOrderSound();

        // Remove flash after 3 seconds
        setTimeout(() => setFlashingOrder(null), 3000);
      },
      onOrderUpdated: (data) => {
        const newStatus = data.status ?? data.updates?.status;
        const terminalStatuses = ['completed', 'cancelled'];
        if (terminalStatuses.includes(newStatus)) {
          removeOrder(data.orderId);
        } else {
          updateOrder(data.orderId, { status: newStatus });
          router.refresh();
        }
      },
    });

    return unsubscribe;
  }, [addOrder, updateOrder, removeOrder, router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  // Play new order sound
  function playNewOrderSound() {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        // Silently fail if audio can't play (file missing or browser policy)
        console.log('Audio notification not available');
      });
    }
  }

  // Filter to only show active orders
  const activeOrders = orders.filter((order) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  );

  // Sort orders: pending/confirmed first, then preparing, then ready, then by age
  const sortedOrders = [...activeOrders].sort((a, b) => {
    // Priority: pending/confirmed > preparing > ready
    const statusOrder = { pending: 0, confirmed: 0, preparing: 1, ready: 2 };
    const statusDiff =
      statusOrder[a.status as keyof typeof statusOrder] -
      statusOrder[b.status as keyof typeof statusOrder];

    if (statusDiff !== 0) return statusDiff;

    // Then by age (oldest first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (sortedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-3xl text-gray-400 mb-2">No active orders</p>
          <p className="text-xl text-gray-500">
            Orders will appear here when placed
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden audio element for new order sound */}
      <audio ref={audioRef} src="/sounds/new-order.mp3" preload="auto" />

      {/* Order Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedOrders.map((order) => (
          <div
            key={order._id}
            className={`transition-all duration-300 ${
              flashingOrder === order._id ? 'animate-pulse scale-105' : ''
            }`}
          >
            <KitchenOrderCard order={order} />
          </div>
        ))}
      </div>
    </>
  );
}
