import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

const data = monthlyHomePlaceholder;
const CATEGORY_ORDER = ['Fixed', 'Everyday', 'Lifestyle', 'Miscellaneous'];

const RING_SIZE = 160;
const STROKE_WIDTH = 18;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function SpendingDonut() {
  const total = data.chart.reduce((sum, slice) => sum + slice.spent, 0) || 1;
  let cumulative = 0;

  return (
    <View style={styles.ringChartWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="#E3ECEA"
          strokeWidth={STROKE_WIDTH}
          fill="transparent"
        />
        {data.chart.map((slice) => {
          const fraction = slice.spent / total;
          const segmentLength = fraction * CIRCUMFERENCE;
          const segmentVisible = Math.max(segmentLength - 2, 0);
          const offset = CIRCUMFERENCE * (1 - cumulative);
          cumulative += fraction;

          return (
            <Circle
              key={slice.categoryId}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={slice.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${segmentVisible} ${CIRCUMFERENCE}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          );
        })}
      </Svg>
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{formatMoney(data.summary.spentTotal)}</Text>
        <Text style={styles.ringSubtext}>spent this month</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const groupedLines = CATEGORY_ORDER.map((categoryName) => ({
    categoryName,
    lines: data.lines.filter((line) => line.parentCategoryName === categoryName),
  })).filter((group) => group.lines.length > 0);

  const categoryColor = new Map(data.chart.map((slice) => [slice.categoryName, slice.color]));

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
          <SpendingDonut />
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

      {groupedLines.map((group) => (
        <View style={styles.card} key={group.categoryName}>
          <Text style={styles.cardTitle}>{group.categoryName}</Text>
          {group.lines.map((line) => (
            <Pressable key={line.categoryId} style={styles.lineItem}>
              <View style={styles.lineTopRow}>
                <Text style={styles.lineTitle}>{line.categoryName}</Text>
                <Text style={styles.linePlanned}>Planned {formatMoney(line.planned)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(line.progressPct, 100)}%`,
                      backgroundColor: categoryColor.get(group.categoryName) ?? '#6EA68B',
                    },
                  ]}
                />
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
      ))}

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
    color: '#111111',
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
    color: '#111111',
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
    color: '#111111',
  },
  ringWrap: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  ringChartWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
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
    color: '#111111',
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
    color: '#111111',
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
    color: '#111111',
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
    color: '#111111',
    fontWeight: '600',
  },
  helperText: {
    color: '#52706E',
    fontSize: 13,
    lineHeight: 18,
  },
});
