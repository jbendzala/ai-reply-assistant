import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { TonePreference } from '../../src/types';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

const TONES: { value: TonePreference; label: string; description: string }[] = [
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'formal', label: 'Formal', description: 'Professional and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and upbeat' },
];

export default function SettingsScreen() {
  const { tone, setTone } = useSettingsStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

        <Text style={styles.sectionLabel}>REPLY TONE</Text>
        {TONES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.toneCard, tone === t.value && styles.toneCardActive]}
            onPress={() => setTone(t.value)}
            activeOpacity={0.75}
          >
            <View style={styles.toneInfo}>
              <Text style={styles.toneLabel}>{t.label}</Text>
              <Text style={styles.toneDesc}>{t.description}</Text>
            </View>
            {tone === t.value && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.aboutCard}>
          <AboutRow label="Version" value="1.0.0 (Phase 3)" />
          <View style={styles.divider} />
          <AboutRow label="AI Replies" value="Powered by our servers" />
          <View style={styles.divider} />
          <AboutRow label="Bubble overlay" value="Phase 4" />
          <View style={styles.divider} />
          <AboutRow label="iOS extension" value="Phase 5" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  pageTitle: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textDisabled,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
  },
  toneCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toneCardActive: {
    borderColor: Colors.accentBlue,
  },
  toneInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  toneLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  toneDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  checkmark: {
    color: Colors.accentBlue,
    fontSize: 18,
    fontWeight: '700',
  },
  aboutCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  aboutLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  aboutValue: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
