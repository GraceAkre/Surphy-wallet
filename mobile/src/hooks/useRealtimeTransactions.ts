import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeTransactionsReturn {
  newTransactions: Transaction[];
  unreadCount: number;
  markAllRead: () => void;
  isConnected: boolean;
}

export function useRealtimeTransactions(): UseRealtimeTransactionsReturn {
  const [newTransactions, setNewTransactions] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('analyst-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const tx = payload.new as Transaction;
          setNewTransactions((prev) => [tx, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    newTransactions,
    unreadCount,
    markAllRead,
    isConnected,
  };
}
