'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { OrderStatus } from '@/interfaces';

interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  estimatedWaitTime?: number;
  note?: string;
  timestamp: string;
}

interface UseOrderSocketOptions {
  orderId?: string;
  onStatusUpdate?: (update: OrderStatusUpdate) => void;
}

/** REQ-124 — the signed tracking token from the page URL (`?t=`), if any. */
function trackingToken(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('t');
}

/**
 * Hook for managing Socket.IO connection for order updates
 */
export function useOrderSocket({ orderId, onStatusUpdate }: UseOrderSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<OrderStatusUpdate | null>(null);
  
  // Use ref to store the callback to avoid re-running effect when it changes
  const onStatusUpdateRef = useRef(onStatusUpdate);
  
  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io({
      path: '/api/socket',
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);

      // Join order room if orderId is provided
      if (orderId) {
        socketInstance.emit('join-order', { orderId, token: trackingToken() });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('order-status-update', (update: OrderStatusUpdate) => {
      console.log('Received order status update:', update);
      setLastUpdate(update);
      
      if (onStatusUpdateRef.current) {
        onStatusUpdateRef.current(update);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (orderId) {
        socketInstance.emit('leave-order', orderId);
      }
      socketInstance.disconnect();
    };
  }, [orderId]);

  const joinOrder = useCallback((newOrderId: string) => {
    if (socket && isConnected) {
      socket.emit('join-order', { orderId: newOrderId, token: trackingToken() });
    }
  }, [socket, isConnected]);

  const leaveOrder = useCallback((orderIdToLeave: string) => {
    if (socket && isConnected) {
      socket.emit('leave-order', orderIdToLeave);
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    lastUpdate,
    joinOrder,
    leaveOrder,
  };
}
