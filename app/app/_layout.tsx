import { Redirect, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/useAuthStore';
import { useProStore } from '../src/store/useProStore';
import { Colors } from '../src/utils/theme';

export default function RootLayout() {
  const { session, isInitializing, initialize, isPasswordRecovery } = useAuthStore();
  const { initialize: initPro } = useProStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
    initPro();
  }, [initialize, initPro]);

  // Handle replygen://paywall deep link (fired from native OverlayWindow upgrade button)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('paywall') && session) router.push('/paywall');
    });
    return () => sub.remove();
  }, [session]);

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
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
