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

  syncProStatus: () => {
    const session = useAuthStore.getState().session;
    const isPro = session?.user?.app_metadata?.is_pro === true;
    set({ isPro });
    // Log in to RevenueCat with the Supabase user ID so the webhook can match them
    if (session?.user?.id) {
      Purchases.logIn(session.user.id).catch(() => {});
    }
  },

  purchasePro: async () => {
    set({ isLoading: true, error: null });
    try {
      const offerings = await Purchases.getOfferings();
      const monthly = offerings.current?.monthly;
      if (!monthly) throw new Error('No subscription offering available.');

      await Purchases.purchaseStoreProduct(monthly.product);

      // Refresh session so app_metadata.is_pro is updated after webhook fires
      await supabase.auth.refreshSession();
      const session = useAuthStore.getState().session;
      set({ isPro: session?.user?.app_metadata?.is_pro === true });
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
      const hasEntitlement = !!customerInfo.entitlements.active['pro'];
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
