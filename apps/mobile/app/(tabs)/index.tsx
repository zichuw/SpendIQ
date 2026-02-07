import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

const data = monthlyHomePlaceholder;
const CATEGORY_ORDER = ['Fixed', 'Everyday', 'Lifestyle', 'Miscellaneous'];

const RING_SIZE = 160;
const STROKE_WIDTH = 18;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function displayCategoryName(name: string): string {
  return name === 'Miscellaneous' ? 'Misc' : name;
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date(2026, 1, 1));
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedMonthDate.getFullYear());
  const groupedLines = CATEGORY_ORDER.map((categoryName) => ({
    categoryName,
    lines: data.lines.filter((line) => line.parentCategoryName === categoryName),
  })).filter((group) => group.lines.length > 0);

  const monthLabel = selectedMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const openBudgetEditor = () => router.push('/budget-edit' as never);

  return (
    <>
    <View style={styles.screen}>
    <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.monthButton}
          onPress={() => {
            setPickerYear(Math.min(selectedMonthDate.getFullYear(), currentYear));
            setMonthPickerVisible(true);
          }}>
          <Text style={styles.monthButtonText}>{monthLabel}</Text>
          <FontAwesome name="calendar-o" size={16} color="#111111" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={openBudgetEditor}>
          <FontAwesome name="pencil" size={16} color="#294C4A" />
        </Pressable>
      </View>

      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>Monthly Budget: {formatMoney(data.summary.budgetTotal)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending Overview</Text>
        <View style={styles.ringWrap}>
          <SpendingDonut />
          <View style={styles.legend}>
            {data.chart.map((slice) => (
              <View style={styles.legendRow} key={slice.categoryId}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={styles.legendText}>{displayCategoryName(slice.categoryName)}</Text>
                <Text style={styles.legendAmount}>{formatMoney(slice.spent)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {groupedLines.map((group) => (
        <View style={styles.card} key={group.categoryName}>
          <Text style={styles.cardTitle}>{displayCategoryName(group.categoryName)}</Text>
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
                      backgroundColor: '#6EA68B',
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
    </View>
    <Modal
      visible={monthPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMonthPickerVisible(false)}>
      <View style={styles.monthModalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMonthPickerVisible(false)}
        />
        <View style={styles.monthModalCard}>
          <View style={styles.monthModalHeader}>
            <Pressable
              style={styles.yearArrowButton}
              onPress={() => setPickerYear((year) => year - 1)}>
              <FontAwesome name="chevron-left" size={14} color="#294C4A" />
            </Pressable>
            <Text style={styles.monthModalYear}>{pickerYear}</Text>
            <Pressable
              style={[styles.yearArrowButton, pickerYear >= currentYear && styles.disabledButton]}
              disabled={pickerYear >= currentYear}
              onPress={() => setPickerYear((year) => Math.min(year + 1, currentYear))}>
              <FontAwesome name="chevron-right" size={14} color="#294C4A" />
            </Pressable>
          </View>

          <View style={styles.monthGrid}>
            {MONTH_NAMES.map((monthName, monthIndex) => {
              const isSelected =
                selectedMonthDate.getFullYear() === pickerYear &&
                selectedMonthDate.getMonth() === monthIndex;
              const isFutureMonth =
                pickerYear > currentYear || (pickerYear === currentYear && monthIndex > currentMonth);

              return (
                <Pressable
                  key={monthName}
                  style={[
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    isFutureMonth && styles.disabledButton,
                  ]}
                  disabled={isFutureMonth}
                  onPress={() => {
                    setSelectedMonthDate(new Date(pickerYear, monthIndex, 1));
                    setMonthPickerVisible(false);
                  }}>
                  <Text style={[styles.monthCellText, isSelected && styles.monthCellTextSelected]}>
                    {monthName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
    </>
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
    paddingBottom: 120,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECEC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monthButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButtonText: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '400',
    fontFamily: 'NotoSerifKR-Regular',
  },
  monthModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  monthModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  monthModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearArrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF9',
  },
  monthModalYear: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monthCell: {
    width: '31%',
    minWidth: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE8E7',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCellSelected: {
    backgroundColor: '#DDECEA',
    borderColor: '#6EA68B',
  },
  monthCellText: {
    color: '#294C4A',
    fontSize: 15,
    fontWeight: '600',
  },
  monthCellTextSelected: {
    color: '#1D3E3C',
  },
  disabledButton: {
    opacity: 0.4,
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
    color: '#355756',
    fontSize: 16,
    fontWeight: '500',
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
