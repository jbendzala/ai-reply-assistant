import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { useBubblePermissions } from '../src/hooks/useBubblePermissions';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { TonePreference } from '../src/types';
import { Colors, Radius, Spacing, Typography } from '../src/utils/theme';

const { width } = Dimensions.get('window');

const ALL_PAGES = [
  {
    id: 'welcome',
    ionIcon: null,
    title: 'ReplyGen',
    subtitle:
      'A floating bubble that lives on your screen, ready to suggest the perfect reply — instantly.',
  },
  {
    id: 'how',
    ionIcon: 'chatbubble-ellipses-outline',
    title: 'How it works',
    steps: [
      { ionIcon: 'finger-print-outline', text: 'Tap the floating bubble above any chat' },
      { ionIcon: 'sparkles-outline', text: 'AI reads the conversation and labels who said what' },
      { ionIcon: 'copy-outline', text: 'Copy a reply — or tap Scan more for older context' },
    ],
  },
  {
    id: 'permission',
    ionIcon: 'lock-closed-outline',
    title: 'One permission needed',
    subtitle:
      'The bubble needs to appear over other apps. No screen content is ever stored — everything is processed and discarded in real time.',
    androidOnly: true,
  },
  {
    id: 'done',
    ionIcon: 'checkmark-circle-outline',
    title: "You're all set",
    subtitle: 'Choose a reply tone to match your style.',
  },
];

// Permission page only shown on Android — iOS handles overlay differently
const PAGES = ALL_PAGES.filter((p: any) => !p.androidOnly || Platform.OS === 'android');

const TONES: { value: TonePreference; label: string; desc: string; pro?: boolean }[] = [
  { value: 'casual',   label: 'Casual',   desc: 'Relaxed, everyday' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm & approachable' },
  { value: 'formal',   label: 'Formal',   desc: 'Professional & polished' },
  { value: 'witty',    label: 'Witty',    desc: 'Clever & playful',   pro: true },
  { value: 'flirty',   label: 'Flirty',   desc: 'Charming & playful', pro: true },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuthStore();
  const { setTone } = useSettingsStore();
  const { overlayGranted, requestOverlay } = useBubblePermissions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [requestingOverlay, setRequestingOverlay] = useState(false);
  const [selectedTone, setSelectedTone] = useState<TonePreference>('casual');

  const currentPage = PAGES[page] as any;

  // Auto-advance past the permission page once overlay is granted
  useEffect(() => {
    if (overlayGranted && currentPage?.id === 'permission') {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [overlayGranted, page, currentPage]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    setPage(newPage);
  }

  function handleNext() {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    }
  }

  async function handleGrantOverlay() {
    setRequestingOverlay(true);
    await requestOverlay();
    setRequestingOverlay(false);
  }

  async function handleGetStarted() {
    setCompleting(true);
    setTone(selectedTone);
    try {
      await completeOnboarding();
    } catch (_) {
      // Continue even if the metadata update fails
    }
    router.replace('/(tabs)');
  }

  const isLastPage = page === PAGES.length - 1;
  const isPermissionPage = currentPage?.id === 'permission';
  const isDonePage = currentPage?.id === 'done';

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
        {PAGES.map((p: any) => (
          <View key={p.id} style={styles.page}>
            {/* Icon circle */}
            {p.id === 'welcome' ? (
              <View style={styles.logoCircle}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.iconCircle}>
                <Ionicons name={p.ionIcon as any} size={48} color={Colors.accentBlue} />
              </View>
            )}

            <Text style={styles.title}>{p.title}</Text>

            {p.subtitle && <Text style={styles.subtitle}>{p.subtitle}</Text>}

            {/* How it works — step list */}
            {p.steps && (
              <View style={styles.steps}>
                {p.steps.map((step: any, j: number) => (
                  <View key={j} style={styles.step}>
                    <View style={styles.stepIcon}>
                      <Ionicons name={step.ionIcon as any} size={22} color={Colors.accentBlue} />
                    </View>
                    <Text style={styles.stepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Permission step — Android only */}
            {p.id === 'permission' && (
              <View style={styles.permissionBox}>
                <View style={styles.permissionRow}>
                  <Ionicons
                    name={overlayGranted ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                    size={22}
                    color={overlayGranted ? Colors.success : Colors.accentBlue}
                  />
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionLabel}>Display over other apps</Text>
                    <Text style={styles.permissionDesc}>
                      {overlayGranted ? 'Permission granted' : 'Required to show the floating bubble'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.permissionBadge,
                      overlayGranted && styles.permissionBadgeGranted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.permissionBadgeText,
                        overlayGranted && styles.permissionBadgeTextGranted,
                      ]}
                    >
                      {overlayGranted ? 'Granted' : 'Required'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Tone picker — done page */}
            {p.id === 'done' && (
              <View style={styles.toneGrid}>
                {TONES.map(({ value, label, desc, pro }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.toneCard,
                      selectedTone === value && styles.toneCardSelected,
                      pro && styles.toneCardLocked,
                    ]}
                    onPress={pro ? undefined : () => setSelectedTone(value)}
                    activeOpacity={pro ? 1 : 0.7}
                  >
                    <View style={styles.toneLabelRow}>
                      <Text
                        style={[
                          styles.toneLabel,
                          selectedTone === value && styles.toneLabelSelected,
                          pro && styles.toneLabelLocked,
                        ]}
                      >
                        {label}
                      </Text>
                      {pro && (
                        <View style={styles.toneLockBadge}>
                          <Text style={styles.toneLockBadgeText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.toneDesc}>{desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_: any, i: number) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        {isLastPage ? (
          <Button
            label={completing ? 'Setting up...' : 'Get Started'}
            onPress={handleGetStarted}
            disabled={completing}
          />
        ) : isPermissionPage ? (
          <>
            <Button
              label={
                overlayGranted
                  ? 'Permission granted ✓'
                  : requestingOverlay
                  ? 'Opening settings...'
                  : 'Grant permission'
              }
              onPress={overlayGranted ? handleNext : handleGrantOverlay}
              disabled={requestingOverlay}
            />
            <TouchableOpacity style={styles.skipBtn} onPress={handleNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Button label="Next" onPress={handleNext} />
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

  // ── Icon circle ──────────────────────────────────────────────────────────
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: Radius.pill,
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Text ─────────────────────────────────────────────────────────────────
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

  // ── Step list ────────────────────────────────────────────────────────────
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
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },

  // ── Permission step ───────────────────────────────────────────────────────
  permissionBox: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  permissionInfo: {
    flex: 1,
    gap: 2,
  },
  permissionLabel: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  permissionDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  permissionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  permissionBadgeGranted: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: Colors.success,
  },
  permissionBadgeText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },
  permissionBadgeTextGranted: {
    color: Colors.success,
  },

  // ── Tone picker ───────────────────────────────────────────────────────────
  toneGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  toneCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 3,
  },
  toneCardSelected: {
    borderColor: Colors.accentBlue,
    backgroundColor: 'rgba(79,142,247,0.08)',
  },
  toneCardLocked: {
    opacity: 0.55,
  },
  toneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toneLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  toneLabelSelected: {
    color: Colors.accentBlue,
  },
  toneLabelLocked: {
    color: Colors.textDisabled,
  },
  toneLockBadge: {
    backgroundColor: 'rgba(79,142,247,0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
  },
  toneLockBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.accentBlue,
    letterSpacing: 0.5,
  },
  toneDesc: {
    ...Typography.caption,
    color: Colors.textDisabled,
    fontSize: 11,
  },

  // ── Dots ──────────────────────────────────────────────────────────────────
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

  // ── CTA ───────────────────────────────────────────────────────────────────
  cta: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    ...Typography.body,
    color: Colors.textDisabled,
  },
});
