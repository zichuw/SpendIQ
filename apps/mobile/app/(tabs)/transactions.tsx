import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import {
  TransactionRecord,
  getAvailableAccounts,
  getHomeFilterCategories,
  listTransactions,
  normalizeToHomeCategory,
} from '@/src/lib/transactions-store';

const DATE_OPTIONS = [7, 30] as const;

function formatAmount(item: TransactionRecord): string {
  const value = item.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  return item.type === 'income' ? `+${value}` : `-${value}`;
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(input: string): number | null {
  if (!input.trim()) return null;
  const parsed = Number(input.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [rangeDays, setRangeDays] = useState<(typeof DATE_OPTIONS)[number]>(7);
  const [items, setItems] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => getHomeFilterCategories(), []);
  const accounts = useMemo(() => getAvailableAccounts(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Expanded date ranges are always fetched from source.
      const result = await listTransactions({ rangeDays });
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const min = parseAmount(minAmount);
    const max = parseAmount(maxAmount);

    return items.filter((item) => {
      const dateLabel = formatDateLabel(item.date).toLowerCase();
      const query = search.trim().toLowerCase();
      const haystack = `${item.name} ${item.category} ${item.account} ${item.type} ${dateLabel}`.toLowerCase();

      const matchesSearch = query.length === 0 || haystack.includes(query);
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(normalizeToHomeCategory(item.category));
      const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(item.account);
      const matchesMin = min === null || item.amount >= min;
      const matchesMax = max === null || item.amount <= max;

      return matchesSearch && matchesCategory && matchesAccount && matchesMin && matchesMax;
    });
  }, [items, maxAmount, minAmount, search, selectedAccounts, selectedCategories]);

  const grouped = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();
    for (const item of filteredItems) {
      const list = groups.get(item.date) ?? [];
      list.push(item);
      groups.set(item.date, list);
    }

    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredItems]);

  const today = todayIsoDate();

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Transactions</Text>
          <Pressable style={styles.plusButton} onPress={() => router.push('/transactions/new' as Href)}>
            <FontAwesome name="plus" size={18} color="#123B3A" />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <FontAwesome name="search" size={16} color="#607877" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search or filter"
            placeholderTextColor="#6A8281"
            style={styles.searchInput}
          />
          <Pressable style={styles.filterButton} onPress={() => setShowFilters((prev) => !prev)}>
            <FontAwesome name="sliders" size={15} color="#123B3A" />
          </Pressable>
        </View>

        {showFilters && (
          <View style={styles.filterCard}>
            <Text style={styles.filterTitle}>Date range</Text>
            <View style={styles.chipRow}>
              {DATE_OPTIONS.map((option) => {
                const selected = rangeDays === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setRangeDays(option)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option === 7 ? 'Last 7 days' : 'Last 30 days (refetch)'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterTitle}>Category</Text>
            <View style={styles.chipRow}>
              {categories.map((category) => {
                const selected = selectedCategories.includes(category);
                return (
                  <Pressable
                    key={category}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
                      )
                    }>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterTitle}>Account</Text>
            <View style={styles.chipRow}>
              {accounts.map((account) => {
                const selected = selectedAccounts.includes(account);
                return (
                  <Pressable
                    key={account}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() =>
                      setSelectedAccounts((prev) =>
                        prev.includes(account) ? prev.filter((item) => item !== account) : [...prev, account]
                      )
                    }>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{account}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterTitle}>Amount range</Text>
            <View style={styles.amountRow}>
              <TextInput
                value={minAmount}
                onChangeText={setMinAmount}
                placeholder="Min"
                placeholderTextColor="#6A8281"
                keyboardType="decimal-pad"
                multiline
                numberOfLines={2}
                style={styles.amountInput}
              />
              <TextInput
                value={maxAmount}
                onChangeText={setMaxAmount}
                placeholder="Max"
                placeholderTextColor="#6A8281"
                keyboardType="decimal-pad"
                multiline
                numberOfLines={2}
                style={styles.amountInput}
              />
            </View>
            <Text style={styles.helperText}>Values are constrained to a 2-line field with added padding.</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>Loading transactions...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>Could not load transactions: {error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void load()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>No transactions found for this range.</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>No transactions match your search/filters.</Text>
          </View>
        ) : (
          grouped.map(([date, rows]) => (
            <View key={date} style={styles.section}>
              <Text style={styles.sectionTitle}>{date === today ? 'Today' : formatDateLabel(date)}</Text>
              {rows.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.row}
                  onPress={() =>
                    router.push(
                      {
                        pathname: '/transactions/[id]',
                        params: { id: String(item.id) },
                      } as unknown as Href
                    )
                  }>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="tail">
                      {item.category} • {item.account}
                    </Text>
                  </View>
                  <Text style={[styles.amount, item.type === 'income' ? styles.income : styles.expense]}>
                    {formatAmount(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#123B3A',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'left',
  },
  plusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D3E2E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECF4F2',
  },
  searchWrap: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#123B3A',
    fontSize: 16,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0EE',
  },
  filterCard: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 14,
    backgroundColor: '#F9FCFB',
    padding: 12,
    gap: 10,
  },
  filterTitle: {
    color: '#123B3A',
    fontWeight: '700',
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#E5F1EB',
  },
  chipText: {
    color: '#355857',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#123B3A',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    minHeight: 56,
    maxHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#123B3A',
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#607877',
  },
  messageCard: {
    borderWidth: 1,
    borderColor: '#DCE8E7',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  messageText: {
    color: '#355857',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: '#E2EEEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: {
    color: '#123B3A',
    fontWeight: '700',
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#123B3A',
    fontSize: 28,
    fontWeight: '300',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#E7EFEE',
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
  rowMeta: {
    color: '#5D7473',
    fontSize: 13,
  },
  amount: {
    fontSize: 22,
    fontWeight: '500',
    minWidth: 110,
    textAlign: 'right',
  },
  expense: {
    color: '#223A39',
  },
  income: {
    color: '#2D6A4F',
  },
});
