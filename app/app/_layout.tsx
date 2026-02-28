import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors } from '../src/utils/theme';

export default function RootLayout() {
  const { session, isInitializing, initialize } = useAuthStore();

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
      {/* 2. Logged in but onboarding not done → onboarding */}
      {!!session && !onboardingComplete && <Redirect href="/onboarding" />}
      {/* 3. Logged in + onboarding done → home */}
      {!!session && onboardingComplete && <Redirect href="/(tabs)" />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
