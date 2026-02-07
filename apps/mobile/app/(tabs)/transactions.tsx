import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';

export default function TransactionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.body}>Transaction feed screen placeholder.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#234041' },
  body: { marginTop: 8, color: '#5A6D6B' },
});
