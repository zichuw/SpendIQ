import { useEffect, useMemo, useState } from 'react';
import { fetchInsights, InsightCard as ApiInsightCard } from '@/src/lib/api';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';
import { addInsightReport } from '@/src/lib/insight-reports';
import { buildSimplePdf } from '@/src/lib/pdf';

type Timeframe = 'weekly' | 'monthly' | 'yearly';
type BudgetStatus = 'on-track' | 'tight' | 'over';

interface TimeframeMetrics {
  spent: number;
  budget: number;
  compareToLastPeriodPct: number;
  compareToAveragePct: number;
  paceDeltaPct: number;
  chartScale: number;
  visitsScale: number;
}

const BASE = monthlyHomePlaceholder;
const BASE_DATE = new Date(2026, 1, 1);
const TIMEFRAME_OPTIONS: Array<{ id: Timeframe; label: string }> = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const METRICS: Record<Timeframe, TimeframeMetrics> = {
  weekly: {
    spent: 1036.4,
    budget: 1149.5,
    compareToLastPeriodPct: 13.9,
    compareToAveragePct: 16.4,
    paceDeltaPct: 18.2,
    chartScale: 0.28,
    visitsScale: 0.3,
  },
  monthly: {
    spent: BASE.summary.spentTotal,
    budget: BASE.summary.budgetTotal,
    compareToLastPeriodPct: 8.7,
    compareToAveragePct: 11.2,
    paceDeltaPct: 6.4,
    chartScale: 1,
    visitsScale: 1,
  },
  yearly: {
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

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeDateForTimeframe(date: Date, timeframe: Timeframe): Date {
  if (timeframe === 'weekly') return startOfWeek(date);
  if (timeframe === 'monthly') return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), 0, 1);
}

function shiftPeriod(date: Date, timeframe: Timeframe, direction: -1 | 1): Date {
  const shifted = new Date(date);
  if (timeframe === 'weekly') shifted.setDate(shifted.getDate() + direction * 7);
  if (timeframe === 'monthly') shifted.setMonth(shifted.getMonth() + direction);
  if (timeframe === 'yearly') shifted.setFullYear(shifted.getFullYear() + direction);
  return normalizeDateForTimeframe(shifted, timeframe);
}

function getPeriodOffset(date: Date, timeframe: Timeframe): number {
  if (timeframe === 'weekly') {
    const base = startOfWeek(BASE_DATE).getTime();
    const current = startOfWeek(date).getTime();
    return Math.round((current - base) / (7 * 24 * 60 * 60 * 1000));
  }

  if (timeframe === 'monthly') {
    return (date.getFullYear() - BASE_DATE.getFullYear()) * 12 + (date.getMonth() - BASE_DATE.getMonth());
  }

  return date.getFullYear() - BASE_DATE.getFullYear();
}

function formatPeriodLabel(date: Date, timeframe: Timeframe): string {
  if (timeframe === 'weekly') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }

  if (timeframe === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return `${date.getFullYear()}`;
}

function getCurrentPeriodDate(timeframe: Timeframe): Date {
  return normalizeDateForTimeframe(new Date(), timeframe);
}

function clampToCurrentPeriod(date: Date, timeframe: Timeframe): Date {
  const normalized = normalizeDateForTimeframe(date, timeframe);
  const current = getCurrentPeriodDate(timeframe);
  return normalized.getTime() > current.getTime() ? current : normalized;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [periodDate, setPeriodDate] = useState<Date>(getCurrentPeriodDate('monthly'));
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(BASE.chart[0]?.categoryId ?? null);
  const [isExporting, setIsExporting] = useState(false);
  const [insightCards, setInsightCards] = useState<ApiInsightCard[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  
  const onChangeTimeframe = (nextTimeframe: Timeframe) => {
    setTimeframe(nextTimeframe);
    setPeriodDate((prev) => clampToCurrentPeriod(prev, nextTimeframe));
  };

  const currentPeriodDate = getCurrentPeriodDate(timeframe);
  const canGoNextPeriod = periodDate.getTime() < currentPeriodDate.getTime();

  const periodOffset = getPeriodOffset(periodDate, timeframe);
  const trendMultiplier = Math.max(0.65, Math.min(1.55, 1 + periodOffset * 0.03));
  const baseMetrics = METRICS[timeframe];

  const metrics = useMemo(
    () => ({
      spent: baseMetrics.spent * trendMultiplier,
      budget: baseMetrics.budget * (timeframe === 'yearly' ? Math.max(0.7, 1 + periodOffset * 0.01) : 1),
      compareToLastPeriodPct: baseMetrics.compareToLastPeriodPct + periodOffset * 0.7,
      compareToAveragePct: baseMetrics.compareToAveragePct + periodOffset * 0.5,
      paceDeltaPct: baseMetrics.paceDeltaPct + periodOffset * 0.6,
      chartScale: baseMetrics.chartScale * trendMultiplier,
      visitsScale: baseMetrics.visitsScale * trendMultiplier,
    }),
    [baseMetrics, trendMultiplier, timeframe, periodOffset]
  );

  const remaining = metrics.budget - metrics.spent;
  const status = getStatus(metrics.spent, metrics.budget);
  const periodLabel = formatPeriodLabel(periodDate, timeframe);

  const chartData = useMemo(
    () =>
      BASE.chart.map((slice) => ({
        ...slice,
        spent: slice.spent * metrics.chartScale,
      })),
    [metrics.chartScale]
  );

  const maxCategorySpend = chartData.reduce((max, category) => Math.max(max, category.spent), 0) || 1;
  const topCategory = chartData.reduce((prev, current) => (current.spent > prev.spent ? current : prev));
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

  const getMockInsights = (): ApiInsightCard[] => [
    {
      kind: 'alert',
      title: projectionText,
      body:
        timeframe === 'weekly'
          ? `You're spending ${metrics.paceDeltaPct.toFixed(1)}% faster than usual this week.`
          : `Your current pace is ${metrics.paceDeltaPct.toFixed(1)}% above your normal ${timeframe} run rate.`,
      action:
        'Action: pause discretionary spend for 3 days and move restaurant purchases to grocery for the rest of this period.',
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
  ];

  // Fetch AI insights when month changes (only for monthly view)
  useEffect(() => {
    if (timeframe === 'monthly') {
      setIsLoadingInsights(true);
      const monthString = periodDate.toISOString().split('T')[0].substring(0, 7); // YYYY-MM format
      fetchInsights(monthString)
        .then((insights) => {
          if (insights.length > 0) {
            setInsightCards(insights);
          } else {
            // Fallback to mock insights if API returns empty
            setInsightCards(getMockInsights());
          }
        })
        .catch(() => {
          // Fallback to mock insights on error
          setInsightCards(getMockInsights());
        })
        .finally(() => {
          setIsLoadingInsights(false);
        });
    }
  }, [periodDate, timeframe]);

  const onExportPdf = async () => {
    try {
      setIsExporting(true);
      const timestamp = new Date().toLocaleString('en-US');
      const lines = [
        'SpendIQ Insights Report',
        `Generated: ${timestamp}`,
        `Timeframe: ${timeframe}`,
        `Period: ${periodLabel}`,
        '',
        `Total spent: ${formatMoney(metrics.spent)}`,
        `Budget: ${formatMoney(metrics.budget)}`,
        `Remaining/Over: ${remaining >= 0 ? formatMoney(remaining) : `${formatMoney(Math.abs(remaining))} over`}`,
        `Status: ${toTitleCase(status)}`,
        '',
        `Projection: ${projectionText}`,
        '',
        'Top merchants:',
        ...topMerchants.slice(0, 5).map((merchant) => `- ${merchant.name}: ${formatMoney(merchant.totalSpent)} · ${merchant.visits} visits`),
      ];

      const pdfContent = buildSimplePdf(lines);
      const safePeriod = periodLabel.replace(/[^a-zA-Z0-9-]/g, '_');
      const filename = `insights-${timeframe}-${safePeriod}-${Date.now()}.pdf`;
      const file = new File(Paths.document, filename);
      file.create({ intermediates: true, overwrite: true });
      file.write(pdfContent, { encoding: 'utf8' });
      const fileUri = file.uri;

      addInsightReport({
        timeframe,
        periodLabel,
        summary: projectionText,
        fileUri,
      });

      await Share.share({
        title: 'SpendIQ Insights PDF',
        message: `Saved ${filename}`,
        url: fileUri,
      });
    } catch (error) {
      Alert.alert('Export failed', 'Could not generate the insights PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Insights</Text>
        <Pressable style={styles.exportButton} onPress={onExportPdf} disabled={isExporting}>
          <Text style={styles.exportButtonText}>{isExporting ? 'Saving...' : 'Save PDF'}</Text>
        </Pressable>
      </View>

      
      <View style={styles.timeframeRow}>
        {TIMEFRAME_OPTIONS.map((option) => {
          const selected = option.id === timeframe;
          return (
            <Pressable
              key={option.id}
              style={[styles.timeframePill, selected && styles.timeframePillSelected]}
              onPress={() => onChangeTimeframe(option.id)}>
              <Text style={[styles.timeframeText, selected && styles.timeframeTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.periodPickerRow}>
        <Pressable style={styles.periodArrow} onPress={() => setPeriodDate((prev) => shiftPeriod(prev, timeframe, -1))}>
          <Text style={styles.periodArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.periodLabel}>{periodLabel}</Text>
        <Pressable
          style={[styles.periodArrow, !canGoNextPeriod && styles.disabledArrow]}
          disabled={!canGoNextPeriod}
          onPress={() => setPeriodDate((prev) => clampToCurrentPeriod(shiftPeriod(prev, timeframe, 1), timeframe))}>
          <Text style={styles.periodArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <Text style={styles.cardLabel}>Total Spent</Text>
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
              <Text style={styles.barLabel}>{category.categoryName}</Text>
            </Pressable>
          ))}
        </View>
        {selectedCategory ? (
          <View style={styles.subcategoryWrap}>
            <Text style={styles.subcategoryHeader}>{selectedCategory.categoryName} subcategories</Text>
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
          <Text style={styles.compareValue}>{metrics.compareToLastPeriodPct >= 0 ? '+' : ''}{metrics.compareToLastPeriodPct.toFixed(1)}%</Text>
        </Text>
        <Text style={styles.compareLine}>
          vs average {timeframe === 'weekly' ? 'week' : timeframe === 'monthly' ? 'month' : 'year'}:{' '}
          <Text style={styles.compareValue}>{metrics.compareToAveragePct >= 0 ? '+' : ''}{metrics.compareToAveragePct.toFixed(1)}%</Text>
        </Text>
        {timeframe === 'weekly' ? (
          <Text style={styles.weeklyNote}>You're spending {metrics.paceDeltaPct.toFixed(1)}% faster than usual this week.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actionable Insights</Text>
        {insightCards.map((insight) => (
          <View
            key={insight.title}
            style={[styles.insightItem, insight.kind === 'alert' ? styles.insightAlert : styles.insightPositive]}>
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
    paddingBottom: 120,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#123B3A',
  },
  exportButton: {
    backgroundColor: '#DDECEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportButtonText: {
    color: '#123B3A',
    fontWeight: '700',
    fontSize: 13,
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
  periodPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  periodArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5F3',
  },
  periodArrowText: {
    color: '#123B3A',
    fontSize: 22,
    lineHeight: 24,
  },
  disabledArrow: {
    opacity: 0.4,
  },
  periodLabel: {
    color: '#123B3A',
    fontSize: 15,
    fontWeight: '700',
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
