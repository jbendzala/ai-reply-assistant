import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { Colors, Radius, Spacing, Typography } from '../src/utils/theme';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    glyph: '◉',
    title: 'AI Reply Assistant',
    subtitle: 'A floating bubble that lives on your screen, ready to suggest the perfect reply — instantly.',
  },
  {
    glyph: '⊡',
    title: 'How it works',
    steps: [
      { icon: '◉', text: 'Tap the floating bubble anytime' },
      { icon: '⊡', text: 'AI reads the conversation on screen' },
      { icon: '✓', text: 'Pick your perfect reply and send' },
    ],
  },
  {
    glyph: '✓',
    title: "You're all set",
    subtitle: 'Add your OpenAI API key in Settings to get live replies, or use demo mode to try it now.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useSettingsStore();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    setPage(newPage);
  }

  function handleNext() {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    }
  }

  function handleGetStarted() {
    completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={styles.page}>
            <View style={styles.glyphCircle}>
              <Text style={styles.glyph}>{p.glyph}</Text>
            </View>
            <Text style={styles.title}>{p.title}</Text>
            {'subtitle' in p && <Text style={styles.subtitle}>{p.subtitle}</Text>}
            {'steps' in p && p.steps && (
              <View style={styles.steps}>
                {p.steps.map((step, j) => (
                  <View key={j} style={styles.step}>
                    <View style={styles.stepIcon}>
                      <Text style={styles.stepGlyph}>{step.icon}</Text>
                    </View>
                    <Text style={styles.stepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        {page < PAGES.length - 1 ? (
          <Button label="Next" onPress={handleNext} />
        ) : (
          <Button label="Get Started" onPress={handleGetStarted} />
        )}
      </View>
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
  page: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xl,
  },
  glyphCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 40,
    color: Colors.accentBlue,
  },
  title: {
    ...Typography.displaySm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  steps: {
    gap: Spacing.lg,
    alignSelf: 'stretch',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: {
    fontSize: 16,
    color: Colors.accentPurple,
  },
  stepText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.accentBlue,
    width: 20,
  },
  cta: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
});
