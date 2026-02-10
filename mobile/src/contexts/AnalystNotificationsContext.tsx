import React, { createContext, useContext } from 'react';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';
import type { Transaction } from '../lib/types';

interface AnalystNotificationsContextValue {
  newTransactions: Transaction[];
  unreadCount: number;
  markAllRead: () => void;
  isConnected: boolean;
}

const defaultValue: AnalystNotificationsContextValue = {
  newTransactions: [],
  unreadCount: 0,
  markAllRead: () => {},
  isConnected: false,
};

const AnalystNotificationsContext = createContext<AnalystNotificationsContextValue>(defaultValue);

export function AnalystNotificationsProvider({ children }: { children: React.ReactNode }) {
  const realtime = useRealtimeTransactions();

  return (
    <AnalystNotificationsContext.Provider value={realtime}>
      {children}
    </AnalystNotificationsContext.Provider>
  );
}

export function useAnalystNotifications(): AnalystNotificationsContextValue {
  return useContext(AnalystNotificationsContext);
}
