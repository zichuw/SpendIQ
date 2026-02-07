import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { TransactionType, createManualTransaction } from '@/src/lib/transactions-store';

function defaultDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewTransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate());
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
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

    createManualTransaction({
      name: name.trim(),
      category: category.trim(),
      account: account.trim(),
      amount: parsedAmount,
      type,
      date,
      notes: notes.trim() || undefined,
    });

    router.replace('/transactions');
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={14} color="#123B3A" />
          </Pressable>
          <Text style={styles.title}>Add Transaction</Text>
        </View>

        <Text style={styles.subtitle}>Manual entry only</Text>

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
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Category"
          placeholderTextColor="#6A8281"
          style={styles.input}
        />
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
          <Text style={styles.saveText}>Save transaction</Text>
        </Pressable>
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
