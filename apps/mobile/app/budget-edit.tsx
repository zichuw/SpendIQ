import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Stack } from 'expo-router';

export const options = {
  headerShown: false,
};

import { Text } from '@/components/Themed';
import {
  ensureBudgetForMonth,
  getCurrentMonthKey,
  getDefaultUserId,
  getMonthlyHome,
  updateBudgetLine,
  updateBudgetTotal,
} from '@/src/lib/api';

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function BudgetEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [budgetId, setBudgetId] = useState<number | null>(null);
  const [lines, setLines] = useState<Array<{ id: number; name: string; planned: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = getDefaultUserId();
  const month = getCurrentMonthKey();

  const loadBudget = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureBudgetForMonth(userId, month);
      const data = await getMonthlyHome(userId, month);

      setBudgetId(data.budgetId);
      setMonthlyBudget(String(data.summary.budgetTotal));
      setLines(
        data.lines.map((line) => ({
          id: line.categoryId,
          name: line.categoryName,
          planned: String(line.planned),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [month, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget])
  );

  const totalPlanned = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const parsed = Number(line.planned);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [lines]
  );

  const onSave = useCallback(async () => {
    if (!budgetId) {
      Alert.alert('No budget found', 'Could not find a budget for this month.');
      return;
    }

    const total = Number(monthlyBudget);
    if (!Number.isFinite(total) || total < 0) {
      Alert.alert('Invalid total', 'Monthly budget must be a non-negative number.');
      return;
    }

    const parsedLines = lines.map((line) => {
      const amount = Number(line.planned);
      return {
        categoryId: line.id,
        plannedAmount: Number.isFinite(amount) && amount >= 0 ? amount : NaN,
      };
    });

    if (parsedLines.some((line) => Number.isNaN(line.plannedAmount))) {
      Alert.alert('Invalid line item', 'Each category budget must be a non-negative number.');
      return;
    }

    setSaving(true);
    try {
      await updateBudgetTotal(budgetId, total);
      await Promise.all(parsedLines.map((line) => updateBudgetLine(budgetId, line.categoryId, line.plannedAmount)));
      Alert.alert('Saved', 'Budget updated successfully.');
      router.back();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unable to save budget changes.');
    } finally {
      setSaving(false);
    }
  }, [budgetId, lines, monthlyBudget, router]);

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="chevron-left" size={14} color="#123B3A" />
          </Pressable>
          <Text style={styles.title}>Edit Budgets</Text>
        </View>
        <Text style={styles.subtitle}>Update your monthly total and category-level budget targets.</Text>

        {loading ? (
          <View style={[styles.messageCard, styles.loadingCard]}>
            <ActivityIndicator color="#123B3A" />
            <Text style={styles.loadingText}>Loading budget...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>Could not load budget: {error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadBudget()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <TextInput
              value={monthlyBudget}
              onChangeText={setMonthlyBudget}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#6A8281"
            />

            <Text style={styles.sectionTitle}>Category Budgets</Text>
            <View style={styles.categoryList}>
              {lines.map((line) => (
                <View key={line.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{line.name}</Text>
                  <TextInput
                    value={line.planned}
                    onChangeText={(value) =>
                      setLines((prev) =>
                        prev.map((item) => (item.id === line.id ? { ...item, planned: value } : item))
                      )
                    }
                    keyboardType="decimal-pad"
                    style={styles.rowInput}
                    placeholder="0.00"
                    placeholderTextColor="#6A8281"
                  />
                </View>
              ))}
            </View>

            <Text style={styles.summaryText}>Total planned: {formatMoney(totalPlanned)}</Text>

            <Pressable style={styles.saveButton} onPress={onSave} disabled={saving || loading}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </>
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  headerRow: {
    position: 'relative',
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    height: 28,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#123B3A',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#355857',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#123B3A',
  },
  sectionTitle: {
    color: '#123B3A',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  categoryList: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6F0EE',
  },
  rowLabel: {
    flex: 1,
    color: '#123B3A',
    fontSize: 15,
    fontWeight: '700',
  },
  rowInput: {
    width: 130,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    textAlign: 'right',
    fontSize: 16,
    color: '#123B3A',
  },
  summaryText: {
    color: '#355857',
    fontSize: 13,
    fontWeight: '700',
  },
  messageCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    backgroundColor: '#FDF6F5',
    padding: 12,
    gap: 8,
  },
  messageText: {
    color: '#9F3530',
    fontSize: 13,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#355857',
    fontSize: 13,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D5E4E2',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: '#123B3A',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
