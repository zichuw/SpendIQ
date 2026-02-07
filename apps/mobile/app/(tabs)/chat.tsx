import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';

const STARTER_PROMPTS = [
  'I want to buy something but not sure if I have the budget.',
  'I want to know how much more I need to save for my first house or car.',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [draft, setDraft] = useState('');

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" style={styles.iconButton}>
            <FontAwesome name="history" size={18} color="#1D3F40" />
          </Pressable>
          <Text style={styles.title}>SpendIQ chat</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/ai-settings' as never)}>
            <FontAwesome name="cog" size={16} color="#1D3F40" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.assistantTag}>Your personalized financial assistant</Text>

          {STARTER_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              style={styles.promptCard}
              onPress={() => setDraft(prompt)}
              accessibilityRole="button">
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.composerWrap}>
          <Pressable accessibilityRole="button" style={styles.addButton}>
            <FontAwesome name="plus" size={16} color="#1D3F40" />
          </Pressable>
          <View style={styles.inputShell}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask anything"
              placeholderTextColor="#809A99"
              style={styles.input}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              disabled={!canSend}>
              <FontAwesome name="arrow-up" size={14} color={canSend ? '#FFFFFF' : '#7F9493'} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D7E4E3',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8DCDA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAF4F2',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#123B3A', letterSpacing: -0.4 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    flexGrow: 1,
  },
  assistantTag: {
    fontSize: 17,
    lineHeight: 22,
    color: '#234847',
    marginBottom: 4,
    fontWeight: '600',
  },
  promptCard: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  promptText: {
    color: '#1B3D3E',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBDDDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  inputShell: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#CDE0DE',
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 8,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#123B3A',
    fontSize: 20,
    lineHeight: 25,
    maxHeight: 120,
    paddingVertical: 0,
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#DEE8E7',
  },
});
