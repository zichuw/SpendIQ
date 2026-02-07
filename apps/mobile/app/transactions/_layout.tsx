import { Stack } from 'expo-router';

export default function TransactionsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" options={{ title: 'Add Transaction' }} />
      <Stack.Screen name="[id]" options={{ title: 'Transaction Details' }} />
    </Stack>
  );
}
