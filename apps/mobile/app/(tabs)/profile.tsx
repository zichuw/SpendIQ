import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightReport, listInsightReports } from '@/src/lib/insight-reports';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<InsightReport[]>([]);

  const refreshReports = useCallback(() => {
    setReports(listInsightReports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshReports();
    }, [refreshReports])
  );

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved Insight Reports</Text>
        <Text style={styles.subtitle}>PDF exports from the Insights tab are listed here.</Text>

        {reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports yet. Save one from Insights → Save PDF.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportRow}>
              <View style={styles.reportMeta}>
                <Text style={styles.reportTitle}>
                  {report.timeframe.toUpperCase()} · {report.periodLabel}
                </Text>
                <Text style={styles.reportSummary}>{report.summary}</Text>
                <Text style={styles.reportTimestamp}>{formatDate(report.createdAt)}</Text>
              </View>

              <Pressable
                style={styles.shareButton}
                onPress={() =>
                  Share.share({
                    title: 'SpendIQ Insight Report',
                    message: `Insight report (${report.periodLabel})`,
                    url: report.fileUri,
                  })
                }>
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>
            </View>
          ))
        )}
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
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#123B3A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    color: '#123B3A',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#587170',
    fontSize: 13,
  },
  emptyText: {
    color: '#587170',
    fontSize: 14,
  },
  reportRow: {
    borderTopWidth: 1,
    borderTopColor: '#E7EFEE',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportMeta: {
    flex: 1,
    gap: 4,
  },
  reportTitle: {
    color: '#123B3A',
    fontSize: 14,
    fontWeight: '700',
  },
  reportSummary: {
    color: '#355857',
    fontSize: 13,
  },
  reportTimestamp: {
    color: '#6A8281',
    fontSize: 12,
  },
  shareButton: {
    backgroundColor: '#DDECEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareButtonText: {
    color: '#123B3A',
    fontWeight: '700',
    fontSize: 12,
  },
});
