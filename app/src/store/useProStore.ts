import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface ProState {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => void;
  syncProStatus: () => void;
  purchasePro: () => Promise<void>;
  restorePurchases: () => Promise<{ restored: boolean }>;
  clearError: () => void;
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  isLoading: false,
  error: null,

  initialize: () => {
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
    if (!apiKey) return;
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
  },

  syncProStatus: async () => {
    const session = useAuthStore.getState().session;
    if (!session?.user?.id) {
      set({ isPro: false });
      return;
    }
    try {
      // Log in to RC with the Supabase user ID so the webhook can match them
      await Purchases.logIn(session.user.id);
      // Check entitlement directly from RC — most reliable source of truth for UI
      const customerInfo = await Purchases.getCustomerInfo();
      set({ isPro: !!customerInfo.entitlements.active['ReplyGen Pro'] });
    } catch {
      // Fall back to app_metadata if RC is unavailable
      set({ isPro: session?.user?.app_metadata?.is_pro === true });
    }
  },

  purchasePro: async () => {
    set({ isLoading: true, error: null });
    try {
      // Ensure RC is logged in with Supabase user ID before purchasing
      const session = useAuthStore.getState().session;
      if (session?.user?.id) {
        await Purchases.logIn(session.user.id);
      }

      const offerings = await Purchases.getOfferings();
      const monthly = offerings.current?.monthly;
      if (!monthly) throw new Error('No subscription offering available.');

      const { customerInfo } = await Purchases.purchaseStoreProduct(monthly.product);

      // Optimistically set isPro from RC customer info immediately
      const hasEntitlement = !!customerInfo.entitlements.active['ReplyGen Pro'];
      set({ isPro: hasEntitlement });

      // Also refresh session after webhook fires to sync app_metadata
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await supabase.auth.refreshSession();
      const refreshedSession = useAuthStore.getState().session;
      if (refreshedSession?.user?.app_metadata?.is_pro === true) {
        set({ isPro: true });
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        set({ error: e?.message ?? 'Purchase failed. Please try again.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement = !!customerInfo.entitlements.active['ReplyGen Pro'];
      if (hasEntitlement) {
        await supabase.auth.refreshSession();
        const session = useAuthStore.getState().session;
        set({ isPro: session?.user?.app_metadata?.is_pro === true });
      }
      return { restored: hasEntitlement };
    } catch (e: any) {
      set({ error: e?.message ?? 'Restore failed. Please try again.' });
      return { restored: false };
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Sync pro status whenever the auth session changes
useAuthStore.subscribe((state) => {
  if (state.isInitializing) return;
  useProStore.getState().syncProStatus();
});
