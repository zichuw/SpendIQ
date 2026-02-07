import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

type Timeframe = 'weekly' | 'monthly' | 'yearly';
type BudgetStatus = 'on-track' | 'tight' | 'over';

interface TimeframeMetrics {
  label: string;
  spent: number;
  budget: number;
  compareToLastPeriodPct: number;
  compareToAveragePct: number;
  paceDeltaPct: number;
  chartScale: number;
  visitsScale: number;
}

const BASE = monthlyHomePlaceholder;
const TIMEFRAME_OPTIONS: Array<{ id: Timeframe; label: string }> = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const METRICS: Record<Timeframe, TimeframeMetrics> = {
  weekly: {
    label: 'This week',
    spent: 1036.4,
    budget: 1149.5,
    compareToLastPeriodPct: 13.9,
    compareToAveragePct: 16.4,
    paceDeltaPct: 18.2,
    chartScale: 0.28,
    visitsScale: 0.3,
  },
  monthly: {
    label: 'This month',
    spent: BASE.summary.spentTotal,
    budget: BASE.summary.budgetTotal,
    compareToLastPeriodPct: 8.7,
    compareToAveragePct: 11.2,
    paceDeltaPct: 6.4,
    chartScale: 1,
    visitsScale: 1,
  },
  yearly: {
    label: 'This year',
    spent: 46020.3,
    budget: 60000,
    compareToLastPeriodPct: 5.1,
    compareToAveragePct: 9.4,
    paceDeltaPct: 4.3,
    chartScale: 11.5,
    visitsScale: 11.5,
  },
};

const MERCHANTS = [
  { name: 'Amazon', totalSpent: 214.38, visits: 9 },
  { name: 'Whole Foods', totalSpent: 172.11, visits: 6 },
  { name: 'Uber', totalSpent: 121.7, visits: 10 },
  { name: 'Target', totalSpent: 104.44, visits: 4 },
  { name: 'Starbucks', totalSpent: 86, visits: 12 },
  { name: 'Spotify', totalSpent: 11.99, visits: 1 },
] as const;

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function toTitleCase(status: BudgetStatus): string {
  if (status === 'on-track') return 'On Track';
  if (status === 'tight') return 'Tight';
  return 'Over';
}

function getStatus(spent: number, budget: number): BudgetStatus {
  const ratio = budget <= 0 ? 0 : spent / budget;
  if (ratio <= 0.85) return 'on-track';
  if (ratio <= 1) return 'tight';
  return 'over';
}

function darken(hex: string, amount = 0.08): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;

  const delta = Math.round(255 * amount);
  const clamp = (value: number) => Math.max(0, Math.min(255, value));

  const r = clamp(parseInt(normalized.slice(0, 2), 16) - delta);
  const g = clamp(parseInt(normalized.slice(2, 4), 16) - delta);
  const b = clamp(parseInt(normalized.slice(4, 6), 16) - delta);

  return `rgb(${r}, ${g}, ${b})`;
}

export default function InsightsScreen() {
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(BASE.chart[0]?.categoryId ?? null);
  const metrics = METRICS[timeframe];
  const remaining = metrics.budget - metrics.spent;
  const status = getStatus(metrics.spent, metrics.budget);

  const chartData = useMemo(
    () =>
      BASE.chart.map((slice) => ({
        ...slice,
        spent: slice.spent * metrics.chartScale,
      })),
    [metrics.chartScale]
  );

  const maxCategorySpend = chartData.reduce((max, category) => Math.max(max, category.spent), 0) || 1;
  const topCategory = chartData.reduce((prev, current) =>
    current.spent > prev.spent ? current : prev
  );
  const selectedCategory = chartData.find((category) => category.categoryId === selectedCategoryId) ?? chartData[0];

  const selectedSubcategories = useMemo(() => {
    if (!selectedCategory) return [];

    return BASE.lines
      .filter(
        (line) =>
          line.parentCategoryName === selectedCategory.categoryName ||
          line.categoryName === selectedCategory.categoryName
      )
      .map((line) => ({
        ...line,
        spent: line.spent * metrics.chartScale,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [selectedCategory, metrics.chartScale]);

  const topMerchants = useMemo(
    () =>
      MERCHANTS.map((merchant) => ({
        ...merchant,
        totalSpent: merchant.totalSpent * metrics.chartScale,
        visits: Math.max(1, Math.round(merchant.visits * metrics.visitsScale)),
      })).sort((a, b) => b.totalSpent - a.totalSpent || b.visits - a.visits),
    [metrics.chartScale, metrics.visitsScale]
  );

  const projectionDelta = Math.max(metrics.spent * (1 + metrics.paceDeltaPct / 100) - metrics.budget, 0);
  const projectionText =
    projectionDelta > 0
      ? `At this pace, you'll end ${timeframe === 'weekly' ? 'the week' : timeframe} ${formatMoney(projectionDelta)} over.`
      : `At this pace, you'll finish ${timeframe === 'weekly' ? 'the week' : timeframe} under budget.`;

  const insightCards = [
    {
      kind: 'alert',
      title: projectionText,
      body:
        timeframe === 'weekly'
          ? `You're spending ${metrics.paceDeltaPct.toFixed(1)}% faster than usual this week.`
          : `Your current pace is ${metrics.paceDeltaPct.toFixed(1)}% above your normal ${timeframe} run rate.`,
      action: 'Action: pause discretionary spend for 3 days and move restaurant purchases to grocery for the rest of this period.',
    },
    {
      kind: 'alert',
      title: `Category spike: ${topCategory.categoryName} is up 32% vs last month.`,
      body: "You've eaten out 4 more times than your normal monthly pattern.",
      action: 'Action: cap dining to 1 meal out this week and set a hard spend limit alert at $60.',
    },
    {
      kind: 'alert',
      title: 'Savings rate dropped from 14% to 6%.',
      body: 'A new recurring charge appears to be contributing to lower savings consistency.',
      action: 'Action: review new subscriptions and cancel one underused plan by Friday.',
    },
    {
      kind: 'positive',
      title: 'Subscriptions stayed flat for 4 months.',
      body: 'No subscription creep detected; this stability supports long-term budget control.',
      action: 'Keep doing this: review active subscriptions monthly before renewal dates.',
    },
  ] as const;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Insights</Text>

      <View style={styles.timeframeRow}>
        {TIMEFRAME_OPTIONS.map((option) => {
          const selected = option.id === timeframe;
          return (
            <Pressable
              key={option.id}
              style={[styles.timeframePill, selected && styles.timeframePillSelected]}
              onPress={() => setTimeframe(option.id)}>
              <Text style={[styles.timeframeText, selected && styles.timeframeTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <Text style={styles.cardLabel}>Total Spent ({metrics.label})</Text>
          <View
            style={[
              styles.statusTag,
              status === 'on-track' && styles.statusTagOnTrack,
              status === 'tight' && styles.statusTagTight,
              status === 'over' && styles.statusTagOver,
            ]}>
            <Text style={styles.statusTagText}>{toTitleCase(status)}</Text>
          </View>
        </View>
        <Text style={styles.kpiValue}>{formatMoney(metrics.spent)}</Text>
      </View>

      <View style={styles.kpiCard}>
        <Text style={styles.cardLabel}>Budget Remaining / Over Budget</Text>
        <Text style={[styles.kpiValue, remaining < 0 && styles.overBudgetValue]}>
          {remaining >= 0 ? formatMoney(remaining) : `${formatMoney(Math.abs(remaining))} over`}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category Breakdown</Text>
        <Text style={styles.cardHint}>Tap a category to see subcategory spend totals.</Text>
        <View style={styles.chartWrap}>
          {chartData.map((category) => (
            <Pressable
              style={styles.barGroup}
              key={category.categoryId}
              onPress={() => setSelectedCategoryId(category.categoryId)}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max((category.spent / maxCategorySpend) * 100, 8)}%`,
                    backgroundColor:
                      selectedCategory?.categoryId === category.categoryId
                        ? darken(category.color)
                        : category.color,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
        {selectedCategory ? (
          <View style={styles.subcategoryWrap}>
            <Text style={styles.subcategoryHeader}>
              {selectedCategory.categoryName} subcategories
            </Text>
            {selectedSubcategories.map((line) => (
              <View style={styles.subcategoryRow} key={line.categoryId}>
                <Text style={styles.subcategoryName}>{line.categoryName}</Text>
                <Text style={styles.subcategorySpend}>{formatMoney(line.spent)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparisons</Text>
        <Text style={styles.compareLine}>
          vs last {timeframe === 'weekly' ? 'week' : timeframe === 'monthly' ? 'month' : 'year'}:{' '}
          <Text style={styles.compareValue}>+{metrics.compareToLastPeriodPct.toFixed(1)}%</Text>
        </Text>
        <Text style={styles.compareLine}>
          vs average {timeframe === 'weekly' ? 'week' : timeframe === 'monthly' ? 'month' : 'year'}:{' '}
          <Text style={styles.compareValue}>+{metrics.compareToAveragePct.toFixed(1)}%</Text>
        </Text>
        {timeframe === 'weekly' ? (
          <Text style={styles.weeklyNote}>
            You're spending {metrics.paceDeltaPct.toFixed(1)}% faster than usual this week.
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actionable Insights</Text>
        {insightCards.map((insight) => (
          <View
            key={insight.title}
            style={[
              styles.insightItem,
              insight.kind === 'alert' ? styles.insightAlert : styles.insightPositive,
            ]}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightBody}>{insight.body}</Text>
            <Text style={styles.insightAction}>{insight.action}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Merchants</Text>
        <Text style={styles.cardHint}>Sorted by total spending, then visit frequency.</Text>
        {topMerchants.map((merchant) => (
          <View style={styles.merchantRow} key={merchant.name}>
            <Text style={styles.merchantName}>{merchant.name}</Text>
            <Text style={styles.merchantMeta}>
              {formatMoney(merchant.totalSpent)} · {merchant.visits} visits
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 120,
    gap: 12,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#123B3A',
  },
  timeframeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeframePillSelected: {
    backgroundColor: '#DDECEA',
  },
  timeframeText: {
    color: '#335B5A',
    fontSize: 16,
    fontWeight: '600',
  },
  timeframeTextSelected: {
    color: '#123B3A',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    padding: 14,
    gap: 8,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#4A6363',
    fontSize: 14,
    fontWeight: '600',
  },
  kpiValue: {
    color: '#123B3A',
    fontSize: 32,
    fontWeight: '700',
  },
  overBudgetValue: {
    color: '#7C1D1D',
  },
  statusTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTagOnTrack: {
    backgroundColor: '#D8F4E3',
  },
  statusTagTight: {
    backgroundColor: '#FDF2CC',
  },
  statusTagOver: {
    backgroundColor: '#F9D3D3',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#243A3A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#123B3A',
    fontSize: 18,
    fontWeight: '700',
  },
  cardHint: {
    color: '#587170',
    fontSize: 13,
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 180,
    paddingTop: 20,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    height: '100%',
  },
  bar: {
    width: '90%',
    minHeight: 8,
    borderRadius: 8,
  },
  barSelected: {
    borderWidth: 2,
    borderColor: '#173E3C',
  },
  barLabel: {
    fontSize: 11,
    color: '#4F6665',
    textAlign: 'center',
  },
  subcategoryWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3ECEA',
    paddingTop: 10,
    gap: 8,
  },
  subcategoryHeader: {
    color: '#1A4543',
    fontSize: 14,
    fontWeight: '700',
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subcategoryName: {
    color: '#3C5756',
    fontSize: 14,
  },
  subcategorySpend: {
    color: '#123B3A',
    fontSize: 14,
    fontWeight: '600',
  },
  compareLine: {
    color: '#3C5756',
    fontSize: 15,
  },
  compareValue: {
    color: '#123B3A',
    fontWeight: '700',
  },
  weeklyNote: {
    marginTop: 6,
    color: '#123B3A',
    fontSize: 14,
    fontWeight: '600',
  },
  insightItem: {
    borderRadius: 12,
    padding: 12,
    gap: 5,
    borderWidth: 1,
  },
  insightAlert: {
    backgroundColor: '#FFF8E9',
    borderColor: '#F4D58A',
  },
  insightPositive: {
    backgroundColor: '#EAF7EE',
    borderColor: '#B7DEC2',
  },
  insightTitle: {
    color: '#102F2E',
    fontSize: 15,
    fontWeight: '700',
  },
  insightBody: {
    color: '#345656',
    fontSize: 14,
  },
  insightAction: {
    color: '#204D4B',
    fontSize: 13,
    fontWeight: '600',
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDF3F2',
  },
  merchantName: {
    color: '#143E3D',
    fontSize: 15,
    fontWeight: '600',
  },
  merchantMeta: {
    color: '#315351',
    fontSize: 14,
  },
});
