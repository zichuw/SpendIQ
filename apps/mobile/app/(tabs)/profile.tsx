import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightReport, listInsightReports } from '@/src/lib/insight-reports';

type ProfileTab = 'accounts' | 'settings';
type AccountStatus = 'connected' | 'needs re-auth' | 'sync issue';

interface LinkedAccount {
  id: string;
  institution: string;
  nickname: string;
  type: 'checking' | 'credit' | 'savings';
  maskedNumber: string;
  balance: number;
  status: AccountStatus;
}

const LINKED_ACCOUNTS: LinkedAccount[] = [
  {
    id: '1',
    institution: 'Chase',
    nickname: 'Visa',
    type: 'credit',
    maskedNumber: '**** 4443',
    balance: 1384.72,
    status: 'connected',
  },
  {
    id: '2',
    institution: 'Bank of America',
    nickname: 'Daily Spend',
    type: 'checking',
    maskedNumber: '**** 1038',
    balance: 5240.09,
    status: 'needs re-auth',
  },
  {
    id: '3',
    institution: 'Ally',
    nickname: 'Emergency Fund',
    type: 'savings',
    maskedNumber: '**** 8881',
    balance: 9700.55,
    status: 'sync issue',
  },
];

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusStyles(status: AccountStatus) {
  if (status === 'connected') {
    return { backgroundColor: '#D8F4E3', textColor: '#205A38' };
  }
  if (status === 'needs re-auth') {
    return { backgroundColor: '#FDF2CC', textColor: '#7E5B14' };
  }
  return { backgroundColor: '#F9D3D3', textColor: '#7A2525' };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>('accounts');
  const [showBalances, setShowBalances] = useState(true);
  const [reports, setReports] = useState<InsightReport[]>([]);

  const refreshReports = useCallback(() => {
    setReports(listInsightReports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshReports();
    }, [refreshReports])
  );

  const accountCountText = useMemo(() => `${LINKED_ACCOUNTS.length} linked accounts`, []);

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password update flow will be connected next.');
  };

  const handleChangeUsername = () => {
    Alert.alert('Change Username', 'Username update flow will be connected next.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === 'accounts' && styles.tabButtonActive]}
            onPress={() => setActiveTab('accounts')}>
            <Text style={[styles.tabText, activeTab === 'accounts' && styles.tabTextActive]}>Accounts</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('settings')}>
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
          </Pressable>
        </View>

        {activeTab === 'accounts' ? (
          <>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.subtitle}>{accountCountText}</Text>
              <Pressable style={styles.toggleButton} onPress={() => setShowBalances((prev) => !prev)}>
                <Text style={styles.toggleText}>{showBalances ? 'Hide balance' : 'Show balance'}</Text>
              </Pressable>
            </View>

            {LINKED_ACCOUNTS.map((account) => {
              const status = getStatusStyles(account.status);
              const initials = account.institution
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <View key={account.id} style={styles.accountCard}>
                  <View style={styles.accountTopRow}>
                    <View style={styles.logoPill}>
                      <Text style={styles.logoText}>{initials}</Text>
                    </View>
                    <View style={styles.accountTitleWrap}>
                      <Text style={styles.accountTitle}>{account.nickname} {account.maskedNumber}</Text>
                      <Text style={styles.accountInstitution}>{account.institution}</Text>
                    </View>
                  </View>

                  <View style={styles.accountMetaRow}>
                    <Text style={styles.accountMetaLabel}>Type</Text>
                    <Text style={styles.accountMetaValue}>{account.type}</Text>
                  </View>

                  <View style={styles.accountMetaRow}>
                    <Text style={styles.accountMetaLabel}>Balance</Text>
                    <Text style={styles.accountMetaValue}>{showBalances ? formatMoney(account.balance) : '••••••'}</Text>
                  </View>

                  <View style={styles.accountMetaRow}>
                    <Text style={styles.accountMetaLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
                      <Text style={[styles.statusBadgeText, { color: status.textColor }]}>{account.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account Settings</Text>
              <Pressable style={styles.settingRow} onPress={handleChangePassword}>
                <Text style={styles.settingText}>Change password</Text>
              </Pressable>
              <Pressable style={styles.settingRow} onPress={handleChangeUsername}>
                <Text style={styles.settingText}>Change username</Text>
              </Pressable>
              <Pressable style={[styles.settingRow, styles.settingRowDanger]} onPress={handleDeleteAccount}>
                <Text style={styles.settingTextDanger}>Delete account</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Saved Insight Reports</Text>
              <Text style={styles.subtitle}>PDF exports from Insights are listed here.</Text>

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
    paddingBottom: 120,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#123B3A',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#DDECEA',
  },
  tabText: {
    color: '#335B5A',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#123B3A',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButton: {
    backgroundColor: '#ECF3F1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleText: {
    color: '#234041',
    fontWeight: '600',
    fontSize: 12,
  },
  accountCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8E5E3',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4A48',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  accountTitleWrap: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    color: '#123B3A',
    fontSize: 18,
    fontWeight: '700',
  },
  accountInstitution: {
    color: '#5B7472',
    fontSize: 13,
  },
  accountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountMetaLabel: {
    color: '#5A7270',
    fontSize: 13,
  },
  accountMetaValue: {
    color: '#123B3A',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
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
  settingRow: {
    borderTopWidth: 1,
    borderTopColor: '#E6EFEA',
    paddingTop: 12,
    paddingBottom: 2,
  },
  settingRowDanger: {
    marginTop: 4,
  },
  settingText: {
    color: '#214442',
    fontSize: 15,
    fontWeight: '600',
  },
  settingTextDanger: {
    color: '#9D1D1D',
    fontSize: 15,
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
