import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';
import { Button } from './Button';

interface ScanInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

export function ScanInput({ onSubmit, loading }: ScanInputProps) {
  const [text, setText] = useState('');

  function handleSubmit() {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Paste a conversation to test:</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="e.g. Hey, are you free tomorrow?"
        placeholderTextColor={Colors.textDisabled}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <Button
        label="Generate Replies"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading || !text.trim()}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  button: {
    alignSelf: 'stretch',
  },
});
