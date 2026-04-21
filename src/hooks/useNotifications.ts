import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../api/crudApi';
import { useAuth } from './useAuth';

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  meta: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

const POLL_INTERVAL_MS = 30_000;

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ]);
      if (!isMounted.current) return;
      const list = (listRes.data?.data ?? []) as AppNotification[];
      setNotifications(list);
      const count = (countRes.data as any)?.data?.count ?? 0;
      setUnreadCount(count);
    } catch {
      // Silently swallow — axios interceptor handles 401 redirect
    }
  }, [isAuthenticated]);

  useEffect(() => {
    isMounted.current = true;
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      // On failure, refetch to restore truth
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
};

export default useNotifications;
