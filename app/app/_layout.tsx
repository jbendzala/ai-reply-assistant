import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors } from '../src/utils/theme';

export default function RootLayout() {
  const { session, isInitializing, initialize, isPasswordRecovery } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Still restoring session from storage — render nothing to avoid flicker
  if (isInitializing) return null;

  const onboardingComplete = session?.user?.user_metadata?.onboardingComplete === true;

  return (
    <>
      <StatusBar style="light" />
      {/* 1. Not logged in → auth */}
      {!session && <Redirect href="/auth" />}
      {/* 2. Password recovery deep link → reset password screen */}
      {!!session && isPasswordRecovery && <Redirect href="/reset-password" />}
      {/* 3. Logged in but onboarding not done → onboarding */}
      {!!session && !isPasswordRecovery && !onboardingComplete && <Redirect href="/onboarding" />}
      {/* 4. Logged in + onboarding done → home */}
      {!!session && !isPasswordRecovery && onboardingComplete && <Redirect href="/(tabs)" />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
