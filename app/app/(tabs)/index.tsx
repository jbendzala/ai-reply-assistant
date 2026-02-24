import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PermissionStatusCard } from '../../src/components/PermissionStatusCard';
import { ReplySheet } from '../../src/components/ReplySheet';
import { ScanInput } from '../../src/components/ScanInput';
import { useReplyFlow } from '../../src/hooks/useReplyFlow';
import { useReplyStore } from '../../src/store/useReplyStore';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

export default function HomeScreen() {
  const { startFlow, isLoading } = useReplyFlow();
  const { suggestions, reset } = useReplyStore();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [bubbleEnabled, setBubbleEnabled] = useState(false);
  const [lastInput, setLastInput] = useState('');

  // Open sheet when suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0) {
      setSheetVisible(true);
    }
  }, [suggestions]);

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

  function handleBubbleToggle(value: boolean) {
    if (value) {
      Alert.alert(
        'Coming in Phase 4',
        'The floating bubble overlay will be available in the next build.',
        [{ text: 'OK' }],
      );
    }
    setBubbleEnabled(false);
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
          status="not_asked"
          onGrant={() =>
            Alert.alert('Coming in Phase 4', 'Overlay permission will be requested when the bubble is ready.')
          }
        />
        <PermissionStatusCard
          label="Screen Capture"
          status="not_asked"
          onGrant={() =>
            Alert.alert('Coming in Phase 4', 'Screen capture permission will be requested when the bubble is ready.')
          }
        />

        {/* Bubble toggle */}
        <Text style={styles.sectionLabel}>BUBBLE OVERLAY</Text>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Enable floating bubble</Text>
            <Text style={styles.rowSub}>Requires overlay permission</Text>
          </View>
          <Switch
            value={bubbleEnabled}
            onValueChange={handleBubbleToggle}
            trackColor={{ false: Colors.border, true: Colors.accentBlue }}
            thumbColor={Colors.textPrimary}
          />
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
});
