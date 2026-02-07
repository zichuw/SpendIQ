import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMemo, useState } from 'react';
import { Alert, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

type Personality = {
  id: string;
  label: string;
  color: string;
};

const MAX_PERSONALITIES = 3;
const PERSONALITIES: Personality[] = [
  { id: 'humorous', label: 'Humorous', color: '#FFD788' },
  { id: 'sarcastic', label: 'Sarcastic', color: '#D7D4FF' },
  { id: 'nice', label: 'Nice', color: '#C8F2D8' },
  { id: 'cute', label: 'Cute', color: '#FFD3E2' },
  { id: 'direct', label: 'Direct', color: '#CFE8FF' },
  { id: 'coach', label: 'Coach', color: '#FDE1C5' },
];

function describeStrictness(frugalScore: number, personalities: string[]): string {
  const strictBase = frugalScore >= 70 ? 'stricter' : frugalScore <= 30 ? 'more permissive' : 'balanced';
  if (personalities.includes('sarcastic') || personalities.includes('direct')) {
    return `a ${strictBase} style with clear guardrails`;
  }
  if (personalities.includes('nice') || personalities.includes('cute')) {
    return `a ${strictBase} style with softer wording`;
  }
  return `${strictBase} recommendations`;
}

function makePreview(personalities: string[], frugalScore: number, adviceScore: number): string {
  const tone = personalities.length === 0 ? 'neutral and helpful' : personalities.join(', ');
  const mode = adviceScore >= 60 ? 'action-first' : adviceScore <= 40 ? 'analysis-first' : 'balanced';
  const strictness = describeStrictness(frugalScore, personalities);

  if (mode === 'analysis-first') {
    return `Tone: ${tone}. I reviewed your spending pace and you may hit your dining budget in about 6 days. This is ${strictness}.`;
  }
  if (mode === 'action-first') {
    return `Tone: ${tone}. Action to take now: pause non-essential spending this week and set a dining cap today. This uses ${strictness}.`;
  }
  return `Tone: ${tone}. You're close to your dining limit; reduce dining out this week and check progress in 3 days. This reflects ${strictness}.`;
}

function SliderRow({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const updateFromX = (locationX: number) => {
    if (!trackWidth) return;
    const clampedX = Math.max(0, Math.min(locationX, trackWidth));
    const pct = Math.round((clampedX / trackWidth) * 100);
    onChange(pct);
  };

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}</Text>
      </View>
      <Pressable
        style={styles.sliderTrack}
        onLayout={onTrackLayout}
        onPress={(event) => updateFromX(event.nativeEvent.locationX)}>
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value}%` }]} />
      </Pressable>
      <View style={styles.sliderMeta}>
        <Text style={styles.sliderEndLabel}>{leftLabel}</Text>
        <Text style={styles.sliderEndLabel}>{rightLabel}</Text>
      </View>
      <View style={styles.stepButtons}>
        <Pressable onPress={() => onChange(Math.max(0, value - 5))} style={styles.stepButton}>
          <FontAwesome name="minus" size={12} color="#1E3F40" />
        </Pressable>
        <Pressable onPress={() => onChange(Math.min(100, value + 5))} style={styles.stepButton}>
          <FontAwesome name="plus" size={12} color="#1E3F40" />
        </Pressable>
      </View>
    </View>
  );
}

export default function AiSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [savedPersonalities, setSavedPersonalities] = useState<string[]>(['nice']);
  const [savedFrugalScore, setSavedFrugalScore] = useState(55);
  const [savedAdviceScore, setSavedAdviceScore] = useState(60);

  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>(savedPersonalities);
  const [frugalScore, setFrugalScore] = useState(savedFrugalScore);
  const [adviceScore, setAdviceScore] = useState(savedAdviceScore);
  const [showPersonalityHelp, setShowPersonalityHelp] = useState(false);
  const [showFrugalHelp, setShowFrugalHelp] = useState(false);
  const [showModeHelp, setShowModeHelp] = useState(false);

  const previewText = useMemo(
    () => makePreview(selectedPersonalities, frugalScore, adviceScore),
    [selectedPersonalities, frugalScore, adviceScore]
  );

  const hasChanges =
    selectedPersonalities.join('|') !== savedPersonalities.join('|') ||
    frugalScore !== savedFrugalScore ||
    adviceScore !== savedAdviceScore;

  const togglePersonality = (id: string) => {
    if (selectedPersonalities.includes(id)) {
      setSelectedPersonalities((prev) => prev.filter((value) => value !== id));
      return;
    }
    if (selectedPersonalities.length >= MAX_PERSONALITIES) {
      Alert.alert('Limit reached', `You can select up to ${MAX_PERSONALITIES} personalities.`);
      return;
    }
    setSelectedPersonalities((prev) => [...prev, id]);
  };

  const onCancel = () => {
    setSelectedPersonalities(savedPersonalities);
    setFrugalScore(savedFrugalScore);
    setAdviceScore(savedAdviceScore);
    router.replace('/(tabs)/chat' as never);
  };

  const onSave = () => {
    setSavedPersonalities(selectedPersonalities);
    setSavedFrugalScore(frugalScore);
    setSavedAdviceScore(adviceScore);
    router.replace('/(tabs)/chat' as never);
  };

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)/chat' as never)}>
            <FontAwesome name="chevron-left" size={14} color="#123B3A" />
          </Pressable>
          <Text style={styles.title}>AI Settings</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Personality</Text>
            <Pressable onPress={() => setShowPersonalityHelp((prev) => !prev)} style={styles.infoButton}>
              <FontAwesome name="info-circle" size={15} color="#355857" />
            </Pressable>
          </View>
          {showPersonalityHelp ? (
            <Text style={styles.helpText}>
              Shapes response tone and recommendation strictness. Select up to {MAX_PERSONALITIES}.
            </Text>
          ) : null}

          <View style={styles.chipsWrap}>
            {PERSONALITIES.map((item) => {
              const selected = selectedPersonalities.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: item.color, borderColor: item.color },
                  ]}
                  onPress={() => togglePersonality(item.id)}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.selectionMeta}>
            {selectedPersonalities.length}/{MAX_PERSONALITIES} selected
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Generous / Frugal</Text>
            <Pressable onPress={() => setShowFrugalHelp((prev) => !prev)} style={styles.infoButton}>
              <FontAwesome name="info-circle" size={15} color="#355857" />
            </Pressable>
          </View>
          {showFrugalHelp ? (
            <Text style={styles.helpText}>
              Lower values permit more discretionary spending. Higher values tighten limits and warnings.
            </Text>
          ) : null}
          <SliderRow
            label="Spending strictness"
            leftLabel="Generous"
            rightLabel="Frugal"
            value={frugalScore}
            onChange={setFrugalScore}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Analysis / Advice</Text>
            <Pressable onPress={() => setShowModeHelp((prev) => !prev)} style={styles.infoButton}>
              <FontAwesome name="info-circle" size={15} color="#355857" />
            </Pressable>
          </View>
          {showModeHelp ? (
            <Text style={styles.helpText}>
              Move left for deeper diagnosis. Move right for direct, actionable steps.
            </Text>
          ) : null}
          <SliderRow
            label="Response style"
            leftLabel="Analysis"
            rightLabel="Advice"
            value={adviceScore}
            onChange={setAdviceScore}
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Live Preview</Text>
          <Text style={styles.previewText}>{previewText}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, !hasChanges && styles.disabledButton]} onPress={onSave}>
          <Text style={[styles.saveText, !hasChanges && styles.disabledText]}>Save Changes</Text>
        </Pressable>
      </View>
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
    paddingBottom: 150,
    gap: 14,
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
  sectionCard: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#123B3A',
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    color: '#50706E',
    fontSize: 13,
    lineHeight: 18,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CFE1E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    color: '#1F4544',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#103A39',
  },
  selectionMeta: {
    color: '#65827F',
    fontSize: 12,
    fontWeight: '600',
  },
  sliderWrap: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: '#2A4F4E',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderValue: {
    color: '#2A4F4E',
    fontSize: 14,
    fontWeight: '700',
  },
  sliderTrack: {
    position: 'relative',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E3EFEE',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: '#2D6A4F',
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2D6A4F',
  },
  sliderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderEndLabel: {
    color: '#587170',
    fontSize: 12,
  },
  stepButtons: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  stepButton: {
    borderWidth: 1,
    borderColor: '#CFE1E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#D5E4E2',
    borderRadius: 16,
    backgroundColor: '#F4FBFA',
    padding: 14,
    gap: 8,
  },
  previewTitle: {
    color: '#123B3A',
    fontSize: 17,
    fontWeight: '700',
  },
  previewText: {
    color: '#234847',
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DBE7E6',
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C8DCDA',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#1F4544',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2D6A4F',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#D9E5E3',
  },
  disabledText: {
    color: '#6F8381',
  },
});
