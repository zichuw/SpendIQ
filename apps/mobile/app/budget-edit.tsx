import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function BudgetEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [monthlyBudget, setMonthlyBudget] = useState(String(monthlyHomePlaceholder.summary.budgetTotal));
  const [lines, setLines] = useState(
    monthlyHomePlaceholder.lines.map((line) => ({
      id: line.categoryId,
      name: line.categoryName,
      planned: String(line.planned),
    }))
  );

  const totalPlanned = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const parsed = Number(line.planned);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [lines]
  );

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Edit Budgets</Text>
          <Pressable style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Budget</Text>
          <TextInput
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholder="0.00"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category Budgets</Text>
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
              />
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Total planned: {formatMoney(totalPlanned)}</Text>
        </View>
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
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: '#294C4A',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#123B3A',
    fontSize: 24,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#DDECEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    color: '#123B3A',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#123B3A',
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DCE8E7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#123B3A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLabel: {
    flex: 1,
    color: '#244645',
    fontSize: 15,
    fontWeight: '600',
  },
  rowInput: {
    width: 120,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 15,
    color: '#123B3A',
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    backgroundColor: '#F5FAF8',
    padding: 14,
  },
  summaryText: {
    color: '#123B3A',
    fontSize: 16,
    fontWeight: '700',
  },
});
