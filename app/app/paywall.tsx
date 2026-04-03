import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProStore } from '../src/store/useProStore';
import { Colors, Radius, Spacing, Typography } from '../src/utils/theme';

const FEATURES = [
  'Unlimited AI scans — no monthly cap',
  'Priority AI responses',
  'Cancel anytime, no commitment',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { isPro, isLoading, error, purchasePro, restorePurchases, clearError } = useProStore();

  // Close automatically if already pro (e.g. after restore)
  useEffect(() => {
    if (isPro) router.back();
  }, [isPro]);

  useEffect(() => {
    if (error) {
      Alert.alert('Something went wrong', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  async function handleRestore() {
    const { restored } = await restorePurchases();
    if (!restored) {
      Alert.alert('No purchases found', 'No active Pro subscription was found for this account.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="flash-outline" size={36} color={Colors.accentBlue} />
        </View>

        {/* Heading */}
        <Text style={styles.title}>ReplyGen Pro</Text>
        <Text style={styles.subtitle}>Unlimited AI replies, every month.</Text>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.accentBlue} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <Text style={styles.price}>$4.99</Text>
          <Text style={styles.pricePeriod}>/ month · Cancel anytime</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
          onPress={purchasePro}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.ctaText}>Start Pro — $4.99 / month</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={isLoading} activeOpacity={0.7}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legal}>
          Payment will be charged to your Google Play account. Subscription automatically renews unless cancelled at least 24 hours before the end of the billing period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
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
  },
  features: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  priceCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(79,142,247,0.08)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  ctaBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.accentBlue,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    ...Typography.label,
    color: '#fff',
    fontSize: 16,
  },
  restoreText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  legal: {
    ...Typography.caption,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
});
