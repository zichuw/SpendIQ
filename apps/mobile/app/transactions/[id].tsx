import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import {
  TransactionRecord,
  TransactionType,
  findTransactionById,
  getHomeFilterCategories,
  normalizeToHomeCategory,
  updateTransaction,
} from '@/src/lib/transactions-store';

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryOptions = getHomeFilterCategories();

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Invalid transaction id.');
      return;
    }

    const found = findTransactionById(id);
    if (!found) {
      setError('Transaction not found.');
      return;
    }

    setTransaction(found);
    setName(found.name);
    setCategory(normalizeToHomeCategory(found.category));
    setAccount(found.account);
    setAmount(`$${found.amount.toFixed(2)}`);
    setDate(found.date);
    setNotes(found.notes ?? '');
    setType(found.type);
  }, [id]);

  const onSave = () => {
    if (!transaction) return;

    const parsedAmount = Number(amount.replace(/[^0-9.]/g, ''));
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }
    if (!account.trim()) {
      setError('Account is required.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date must use YYYY-MM-DD format.');
      return;
    }

    updateTransaction(transaction.id, {
      name: name.trim(),
      category,
      account: account.trim(),
      amount: parsedAmount,
      type,
      date,
      notes: notes.trim() || undefined,
    });

    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={14} color="#123B3A" />
          </Pressable>
          <Text style={styles.title}>Transaction Details</Text>
        </View>

        {!transaction ? (
          <Text style={styles.errorText}>{error ?? 'Loading transaction...'}</Text>
        ) : (
          <>
            <Text style={styles.subtitle}>Tap fields to edit and save changes.</Text>

            <View style={styles.typeToggle}>
              {(['expense', 'income'] as const).map((entry) => {
                const selected = type === entry;
                return (
                  <Pressable
                    key={entry}
                    style={[styles.typeButton, selected && styles.typeButtonSelected]}
                    onPress={() => setType(entry)}>
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{entry}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Description / payee"
              placeholderTextColor="#6A8281"
              style={styles.input}
            />
            <View>
              <Pressable style={styles.dropdownTrigger} onPress={() => setShowCategoryMenu((prev) => !prev)}>
                <Text style={styles.dropdownText}>{category || 'Category'}</Text>
                <FontAwesome name={showCategoryMenu ? 'chevron-up' : 'chevron-down'} size={13} color="#355857" />
              </Pressable>
              {showCategoryMenu ? (
                <View style={styles.dropdownMenu}>
                  {categoryOptions.map((option) => {
                    const selected = option === category;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                        onPress={() => {
                          setCategory(option);
                          setShowCategoryMenu(false);
                        }}>
                        <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <TextInput
              value={account}
              onChangeText={setAccount}
              placeholder="Account"
              placeholderTextColor="#6A8281"
              style={styles.input}
            />
            <TextInput
              value={amount}
              onChangeText={(next) => {
                const sanitized = next.replace(/[^0-9.]/g, '');
                setAmount(`$${sanitized}`);
              }}
              placeholder="Amount"
              placeholderTextColor="#6A8281"
              keyboardType="numbers-and-punctuation"
              style={styles.input}
            />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6A8281"
              style={styles.input}
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor="#6A8281"
              multiline
              style={[styles.input, styles.notesInput]}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveText}>Save changes</Text>
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
  typeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButtonSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#E4F1EA',
  },
  typeLabel: {
    color: '#355857',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  typeLabelSelected: {
    color: '#123B3A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#123B3A',
    fontSize: 16,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    color: '#123B3A',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6F0EE',
  },
  dropdownItemSelected: {
    backgroundColor: '#EAF4EF',
  },
  dropdownItemText: {
    color: '#1F4544',
    fontSize: 15,
  },
  dropdownItemTextSelected: {
    color: '#123B3A',
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#9F3530',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
