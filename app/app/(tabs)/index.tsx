import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenCapture from 'screen-capture';
import { PermissionStatusCard } from '../../src/components/PermissionStatusCard';
import { ReplySheet } from '../../src/components/ReplySheet';
import { ScanInput } from '../../src/components/ScanInput';
import { useBubbleEvents } from '../../src/hooks/useBubbleEvents';
import { useBubblePermissions } from '../../src/hooks/useBubblePermissions';
import { useReplyFlow } from '../../src/hooks/useReplyFlow';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useReplyStore } from '../../src/store/useReplyStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

export default function HomeScreen() {
  const { startFlow, isLoading } = useReplyFlow();
  const { suggestions, reset } = useReplyStore();
  const { tone, setTone } = useSettingsStore();
  const session = useAuthStore((s) => s.session);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [bubbleEnabled, setBubbleEnabled] = useState(false);
  const [lastInput, setLastInput] = useState('');

  // ─── Permissions (no-ops on non-Android internally) ───────────────────
  const { overlayGranted, screenRecordingStatus, requestOverlay, requestScreenRecording, refresh } = useBubblePermissions();

  // Refresh permission state when user comes back from Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Persist Supabase config to native so backgrounded OkHttp calls work
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (supabaseUrl && supabaseAnonKey) {
      ScreenCapture.configureBubbleService({
        supabaseUrl,
        supabaseAnonKey,
        tone,
        accessToken: session?.access_token ?? '',
      });
    }
  }, [tone, session]);

  // ─── Bubble events (no-ops on non-Android internally) ─────────────────
  const handleCapturedText = useCallback(
    (text: string) => {
      setLastInput(text);
      startFlow(text);
    },
    [startFlow],
  );

  useBubbleEvents(handleCapturedText);

  // Open sheet when suggestions arrive; also push them to the native overlay
  useEffect(() => {
    if (suggestions.length === 0) return;
    setSheetVisible(true);
    if (Platform.OS === 'android') {
      ScreenCapture.sendRepliesToNative(suggestions.map((s) => s.text));
    }
  }, [suggestions]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  function handleScan(text: string) {
    setLastInput(text);
    startFlow(text);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    reset();
  }

  function handleRetry() {
    if (lastInput) startFlow(lastInput);
  }

  async function handleBubbleToggle(value: boolean) {
    if (Platform.OS !== 'android') return;

    if (value) {
      if (!overlayGranted) {
        await requestOverlay();
        return; // Don't enable until permission is confirmed
      }
      await ScreenCapture.startBubbleService();
      setBubbleEnabled(true);
    } else {
      await ScreenCapture.stopBubbleService();
      setBubbleEnabled(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Reply Assistant</Text>
          <Text style={styles.subtitle}>Your smart reply companion</Text>
        </View>

        {/* Permissions */}
        <Text style={styles.sectionLabel}>PERMISSIONS</Text>
        <PermissionStatusCard
          label="Screen Overlay"
          status={overlayGranted ? 'granted' : 'not_asked'}
          onGrant={requestOverlay}
        />
        <PermissionStatusCard
          label="Screen Recording"
          status={screenRecordingStatus}
          onGrant={requestScreenRecording}
        />

        {/* Bubble toggle */}
        <Text style={styles.sectionLabel}>BUBBLE OVERLAY</Text>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Enable floating bubble</Text>
            <Text style={styles.rowSub}>
              {overlayGranted ? 'Tap to scan any conversation' : 'Requires overlay permission'}
            </Text>
          </View>
          <Switch
            value={bubbleEnabled}
            onValueChange={handleBubbleToggle}
            disabled={Platform.OS !== 'android'}
            trackColor={{ false: Colors.border, true: Colors.accentBlue }}
            thumbColor={Colors.textPrimary}
          />
        </View>

        {/* Tone selector */}
        <Text style={styles.sectionLabel}>REPLY TONE</Text>
        <View style={styles.toneRow}>
          {(['casual', 'formal', 'friendly', 'witty'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toneChip, tone === t && styles.toneChipActive]}
              onPress={() => setTone(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toneChipText, tone === t && styles.toneChipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Test scan */}
        <Text style={styles.sectionLabel}>TEST REPLY GENERATION</Text>
        <ScanInput onSubmit={handleScan} loading={isLoading} />
      </ScrollView>

      <ReplySheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        onRetry={handleRetry}
      />
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
  header: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textDisabled,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  rowLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  rowSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  toneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toneChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toneChipActive: {
    backgroundColor: Colors.accentBlue,
    borderColor: Colors.accentBlue,
  },
  toneChipText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  toneChipTextActive: {
    color: Colors.textPrimary,
  },
});
