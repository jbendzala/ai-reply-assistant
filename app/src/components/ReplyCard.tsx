import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

interface ReplyCardProps {
  text: string;
}

export function ReplyCard({ text }: ReplyCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.7}>
        <Text style={[styles.copyLabel, copied && styles.copiedLabel]}>
          {copied ? '✓ Copied' : 'Copy'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  text: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  copyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  copyLabel: {
    ...Typography.label,
    color: Colors.accentBlue,
  },
  copiedLabel: {
    color: Colors.success,
  },
});
