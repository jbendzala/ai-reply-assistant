import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUsageCount } from '../../src/hooks/useUsageCount';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import { validatePassword } from '../../src/utils/validatePassword';

export default function SettingsScreen() {
  const { session, signOut, changePassword, deleteAccount } = useAuthStore();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { count, loading: usageLoading, limit, resetDate } = useUsageCount();

  const isEmailUser = session?.user?.app_metadata?.provider === 'email';

  const [pwExpanded, setPwExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword() {
    setPwError('');
    setPwSuccess(false);
    const { valid, message } = validatePassword(newPassword);
    if (!valid) {
      setPwError(message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(newPassword);
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e?.message ?? 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await deleteAccount();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete account.');
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ],
    );
  }

  function handleToggleExpand() {
    setPwExpanded((v) => !v);
    setPwError('');
    setPwSuccess(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Settings</Text>

        <Text style={styles.sectionLabel}>USAGE THIS MONTH</Text>
        <View style={styles.usageCard}>
          <View style={styles.usageRow}>
            <Text style={styles.usageText}>
              {usageLoading || count === null ? '—' : count} / {limit} scans used
            </Text>
            <Text style={styles.usageReset}>Resets {resetDate}</Text>
          </View>
          <View style={styles.usageTrack}>
            <View
              style={[
                styles.usageFill,
                {
                  width: `${Math.min(((count ?? 0) / limit) * 100, 100)}%`,
                  backgroundColor:
                    (count ?? 0) >= limit
                      ? Colors.error
                      : (count ?? 0) >= limit * 0.8
                      ? '#F59E0B'
                      : Colors.accentBlue,
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue} numberOfLines={1}>
              {session?.user.email ?? '—'}
            </Text>
          </View>

          {isEmailUser && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.accountRow}
                onPress={handleToggleExpand}
                activeOpacity={0.7}
              >
                <Text style={styles.accountLabel}>Change Password</Text>
                <Text style={styles.chevron}>{pwExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {pwExpanded && (
                <View style={styles.pwForm}>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="New password"
                      placeholderTextColor={Colors.textDisabled}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(v => !v)} activeOpacity={0.7}>
                      <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm new password"
                      placeholderTextColor={Colors.textDisabled}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
                  {pwSuccess ? (
                    <View style={styles.pwSuccessBanner}>
                      <Text style={styles.pwSuccessText}>✓ Password updated successfully</Text>
                    </View>
                  ) : null}
                  {!pwSuccess && (
                    <TouchableOpacity
                      style={styles.pwSaveButton}
                      onPress={handleChangePassword}
                      disabled={pwLoading}
                      activeOpacity={0.75}
                    >
                      {pwLoading ? (
                        <ActivityIndicator color={Colors.textPrimary} size="small" />
                      ) : (
                        <Text style={styles.pwSaveText}>Save Password</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.75}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleteLoading}
          activeOpacity={0.75}
        >
          {deleteLoading ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  pageTitle: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textDisabled,
    marginTop: Spacing.sm,
    marginBottom: 2,
    letterSpacing: 0.8,
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  chevron: {
    ...Typography.caption,
    color: Colors.textDisabled,
  },
  pwForm: {
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  pwError: {
    ...Typography.caption,
    color: Colors.error,
  },
  pwSuccessBanner: {
    backgroundColor: '#14532D',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#22C55E',
    padding: Spacing.md,
    alignItems: 'center',
  },
  pwSuccessText: {
    ...Typography.label,
    color: '#22C55E',
    fontSize: 14,
  },
  pwSaveButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: 4,
  },
  pwSaveText: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 14,
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
  deleteButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  deleteText: {
    ...Typography.label,
    color: Colors.textDisabled,
    fontSize: 15,
  },
  usageCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  usageReset: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  usageTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  usageFill: {
    height: 4,
    borderRadius: 2,
  },
});
