import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

const data = monthlyHomePlaceholder;

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.monthButton}>
          <Text style={styles.monthButtonText}>SpendIQ / February 2026</Text>
        </Pressable>
        <Pressable style={styles.iconButton}>
          <FontAwesome name="plus" size={16} color="#294C4A" />
        </Pressable>
      </View>

      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>Monthly Budget: {formatMoney(data.summary.budgetTotal)}</Text>
        <Pressable>
          <FontAwesome name="pencil" size={14} color="#294C4A" />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending Overview</Text>
        <View style={styles.ringWrap}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.ringValue}>{formatMoney(data.summary.spentTotal)}</Text>
              <Text style={styles.ringSubtext}>spent this month</Text>
            </View>
          </View>
          <View style={styles.legend}>
            {data.chart.map((slice) => (
              <View style={styles.legendRow} key={slice.categoryId}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={styles.legendText}>{slice.categoryName}</Text>
                <Text style={styles.legendAmount}>{formatMoney(slice.spent)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lifestyle</Text>
        {data.lines.map((line) => (
          <Pressable key={line.categoryId} style={styles.lineItem}>
            <View style={styles.lineTopRow}>
              <Text style={styles.lineTitle}>{line.categoryName}</Text>
              <Text style={styles.linePlanned}>Planned {formatMoney(line.planned)}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(line.progressPct, 100)}%` }]} />
            </View>
            <View style={styles.lineMetaRow}>
              <Text style={styles.lineMeta}>Spent {formatMoney(line.spent)}</Text>
              <Text style={styles.lineMeta}>Remaining {formatMoney(line.remaining)}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable style={styles.addRow}>
          <FontAwesome name="plus-circle" size={16} color="#2D6A4F" />
          <Text style={styles.addText}>Add subcategory</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync + Guidance</Text>
        <Text style={styles.helperText}>Last bank sync: {data.sync.lastTransactionSyncAt}</Text>
        <Text style={styles.helperText}>Tap any subcategory to drill into spending details.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F7F6',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 120,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    borderWidth: 1,
    borderColor: '#BFD1CF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  monthButtonText: {
    color: '#234041',
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDECEA',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  budgetLabel: {
    color: '#234041',
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#264847',
  },
  ringWrap: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 18,
    borderColor: '#CFE1DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2F1',
  },
  ringInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ringValue: {
    fontWeight: '700',
    color: '#173635',
    fontSize: 14,
    textAlign: 'center',
  },
  ringSubtext: {
    fontSize: 11,
    textAlign: 'center',
    color: '#587170',
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    color: '#315351',
    fontSize: 13,
  },
  legendAmount: {
    color: '#315351',
    fontWeight: '600',
    fontSize: 12,
  },
  lineItem: {
    gap: 6,
    paddingVertical: 4,
  },
  lineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineTitle: {
    color: '#244B48',
    fontWeight: '600',
    fontSize: 15,
  },
  linePlanned: {
    color: '#577170',
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E8EFEE',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6EA68B',
  },
  lineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineMeta: {
    color: '#506968',
    fontSize: 12,
  },
  addRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addText: {
    color: '#2D6A4F',
    fontWeight: '600',
  },
  helperText: {
    color: '#52706E',
    fontSize: 13,
    lineHeight: 18,
  },
});
