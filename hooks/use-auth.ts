'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/interfaces/user.interface';

import { getPrimaryRole } from '@/lib/session';
interface User {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  role?: UserRole;
  totalSpent?: number;
  rewardsEarned?: number;
  orderCount?: number;
  isGuest?: boolean;
  addresses?: any[];
}

interface SessionData {
  isLoggedIn: boolean;
  userId?: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
  role?: UserRole;
  totalSpent?: number;
  rewardsEarned?: number;
  orderCount?: number;
  isGuest?: boolean;
}

async function fetchSession(): Promise<SessionData> {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  return response.json();
}

async function fetchUser(): Promise<User> {
  const response = await fetch('/api/auth/user');
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  const data = await response.json();
  return data.user;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    enabled: !!session?.isLoggedIn && !session?.isGuest,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/');
    },
  });

  const refreshSession = () => {
    queryClient.invalidateQueries({ queryKey: ['session'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  return {
    session,
    user,
    isLoading,
    error,
    isAuthenticated: session?.isLoggedIn ?? false,
    isGuest: session?.isGuest ?? false,
    role: getPrimaryRole(session) || user?.role,
    logout: logoutMutation.mutate,
    refreshSession,
  };
}
