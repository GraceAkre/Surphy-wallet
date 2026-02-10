import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ShieldAlert, Search } from 'lucide-react-native';

// Components
import { Input } from '../../components/ui';
import { AlertItem } from '../../components/analyst/AlertItem';
import { FilterBar } from '../../components/analyst/FilterBar';
import { EmptyState } from '../../components/feedback';

// API
import { getAllTransactions } from '../../lib/analystApi';
import type { Transaction, AlertFilter } from '../../lib/types';

// Utils
import { useHaptics } from '../../hooks/useHaptics';

// --- Types ---

type AnalystAlertsScreenProps = {
  navigation: any;
};

export default function AnalystAlertsScreen({ navigation }: AnalystAlertsScreenProps) {
  const { light } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<AlertFilter>({
    decision: 'all',
    period: 'all',
  });
  const [searchText, setSearchText] = useState('');
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(
    async (currentFilter: AlertFilter, currentPage = 0, append = false) => {
      try {
        const data = await getAllTransactions(currentFilter, currentPage, 20);
        if (append) {
          setTransactions((prev) => [...prev, ...data]);
        } else {
          setTransactions(data);
        }
        setHasMore(data.length === 20);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(0);
      fetchData(filter, 0);
    }, [fetchData, filter])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await fetchData(filter, 0);
    setRefreshing(false);
  }, [fetchData, filter]);

  const onEndReached = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(filter, nextPage, true);
  }, [loadingMore, hasMore, page, filter, fetchData]);

  const handleFilterChange = useCallback(
    (newFilter: AlertFilter) => {
      setFilter(newFilter);
      setPage(0);
      setLoading(true);
      fetchData(newFilter, 0);
    },
    [fetchData]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        const newFilter = { ...filter, search: text || undefined };
        setFilter(newFilter);
        setPage(0);
        setLoading(true);
        fetchData(newFilter, 0);
      }, 500);
    },
    [filter, fetchData]
  );

  const ListHeader = () => (
    <>
      {/* Header */}
      <View className="px-screen pt-4 pb-2 flex-row items-center gap-2">
        <ShieldAlert size={24} color="#FF9500" />
        <Text className="text-title1 text-ink-primary font-bold">Alertes</Text>
        {!loading && (
          <View className="bg-warning px-2 py-0.5 rounded-full ml-1">
            <Text className="text-caption2 text-white font-bold">{transactions.length}</Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <FilterBar filter={filter} onFilterChange={handleFilterChange} />

      {/* Search */}
      <View className="px-screen mb-4">
        <Input
          placeholder="Rechercher par merchant..."
          leftIcon={Search}
          value={searchText}
          onChangeText={handleSearchChange}
        />
      </View>
    </>
  );

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={loading ? [] : transactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
            </View>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="Aucun résultat"
              message="Aucune transaction ne correspond aux filtres sélectionnés."
            />
          )
        }
        renderItem={({ item }) => (
          <View className="px-screen">
            <AlertItem
              transaction={item}
              onPress={() => {
                light();
                navigation.navigate('AlertDetail', { transactionId: item.id });
              }}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      />
    </SafeAreaView>
  );
}
