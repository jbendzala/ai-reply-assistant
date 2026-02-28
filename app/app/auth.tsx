import { AntDesign, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors, Radius, Spacing, Typography } from '../src/utils/theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuthStore();

  async function handleSubmit() {
    setLocalError('');
    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      // Navigation to /(tabs) is handled by _layout.tsx redirect when session appears
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      if (mode === 'signUp' && /already registered|already exists|email.*taken/i.test(message)) {
        setLocalError('An account with this email already exists. Try signing in instead.');
      } else {
        setLocalError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setLocalError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      setLocalError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  }

  function handleAppleSignIn() {
    Alert.alert('Coming Soon', 'Apple Sign-In will be available in the iOS version.');
  }

  const anyLoading = isSubmitting || isGoogleLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AI Reply Assistant</Text>
            <Text style={styles.subtitle}>
              {mode === 'signIn' ? 'Sign in to your account' : 'Create an account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textDisabled}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {localError ? <Text style={styles.errorText}>{localError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, anyLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={anyLoading}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signIn' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            {/* Google */}
            <TouchableOpacity
              style={[styles.socialButton, anyLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={anyLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#4285F4" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple — placeholder, iOS only */}
            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonDisabled]}
              onPress={handleAppleSignIn}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-apple" size={18} color={Colors.textDisabled} />
              <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>
                Apple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle mode */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === 'signIn' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLocalError('');
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              }}
            >
              <Text style={styles.toggleLink}>
                {mode === 'signIn' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  inputGroup: {
    gap: Spacing.xs,
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
  button: {
    backgroundColor: Colors.accentBlue,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textDisabled,
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
  },
  socialButtonDisabled: {
    opacity: 0.4,
  },
  socialButtonText: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  socialButtonTextDisabled: {
    color: Colors.textDisabled,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  toggleText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  toggleLink: {
    ...Typography.body,
    color: Colors.accentBlue,
    fontWeight: '600',
  },
});
