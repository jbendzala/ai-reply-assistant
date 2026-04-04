import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors, Radius, Spacing, Typography } from '../src/utils/theme';
import { validatePassword } from '../src/utils/validatePassword';

export default function ResetPasswordScreen() {
  const { changePassword, clearPasswordRecovery } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSave() {
    setError('');
    const { valid, message } = validatePassword(newPassword);
    if (!valid) {
      setError(message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(newPassword);
      setSuccess(true);
      setTimeout(() => clearPasswordRecovery(), 1500);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>Choose a strong password for your account.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New password"
                placeholderTextColor={Colors.textDisabled}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNew(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textDisabled}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {success ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>✓ Password updated! Redirecting…</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Save Password</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: Spacing.lg,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
  },
  successBanner: {
    backgroundColor: '#14532D',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#22C55E',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  successText: {
    ...Typography.label,
    color: '#22C55E',
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.accentBlue,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 15,
  },
});
