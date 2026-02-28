import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { TonePreference } from '../../src/types';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

const TONES: { value: TonePreference; label: string; description: string }[] = [
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'formal', label: 'Formal', description: 'Professional and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and upbeat' },
  { value: 'witty', label: 'Witty', description: 'Clever and playful' },
];

export default function SettingsScreen() {
  const { tone, setTone } = useSettingsStore();
  const { session, signOut } = useAuthStore();

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

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue} numberOfLines={1}>
              {session?.user.email ?? '—'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.75}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  accountLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  accountValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  signOutButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  signOutText: {
    ...Typography.label,
    color: Colors.error,
    fontSize: 15,
  },
});
