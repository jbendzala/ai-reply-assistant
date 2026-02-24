import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { Colors } from '../src/utils/theme';

export default function RootLayout() {
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);

  return (
    <>
      <StatusBar style="light" />
      {!onboardingComplete && <Redirect href="/onboarding" />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
