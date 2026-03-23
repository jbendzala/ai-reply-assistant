import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  /** True only during the initial getSession() call on app start. */
  isInitializing: boolean;
  /** True when the app was opened via a password-reset deep link. */
  isPasswordRecovery: boolean;
  initialize: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearPasswordRecovery: () => void;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isInitializing: true,
  isPasswordRecovery: false,

  initialize: () => {
    // Supabase may send password-reset links in either format:
    //   PKCE (flowType:'pkce'):     replygen://reset-password?code=<code>
    //   Implicit (legacy default):  replygen://reset-password#access_token=...&type=recovery
    //
    // This helper tries PKCE first, then falls back to implicit, and returns
    // true when a recovery session was successfully established.
    const applyResetUrl = async (url: string): Promise<boolean> => {
      // Supabase sends an error URL when the link is invalid/expired, e.g.:
      // replygen://reset-password?error=access_denied&error_code=otp_expired
      if (url.includes('error=')) {
        Alert.alert(
          'Link Expired',
          'This password reset link has expired. Please request a new one.',
        );
        return false;
      }

      // ── PKCE path ──────────────────────────────────────────────────────────
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (!error && data.session) {
          set({ session: data.session, isPasswordRecovery: true });
          return true;
        }
      } catch { /* fall through */ }

      // ── Implicit path (tokens in hash fragment) ────────────────────────────
      try {
        const hash = url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session) {
            set({ session: data.session, isPasswordRecovery: params.get('type') === 'recovery' });
            return true;
          }
        }
      } catch { /* fall through */ }

      // Both paths failed — link is invalid or verifier mismatch.
      Alert.alert(
        'Invalid Link',
        'This password reset link is invalid or has already been used. Please request a new one.',
      );
      return false;
    };

    // Warm-start: app is already running when the user taps the reset link.
    Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('reset-password')) await applyResetUrl(url);
    });

    // Cold-start: app was launched from the reset link (or a normal launch).
    // Process the initial URL FIRST so isInitializing stays true until we know
    // whether this is a recovery start, preventing premature /auth redirects.
    Linking.getInitialURL().then(async (url) => {
      if (url && url.includes('reset-password')) {
        const handled = await applyResetUrl(url);
        if (handled) {
          set({ isInitializing: false });
          return;
        }
      }
      // Normal start, or URL exchange failed — restore session from storage.
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, isInitializing: false });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires on startup before getInitialURL() resolves.
      // Ignore it — our getInitialURL flow owns initialization entirely.
      if (event === 'INITIAL_SESSION') return;

      // USER_UPDATED fires when updateUser() is called (e.g. password change).
      // Ignore it — the user is already logged in and on the correct screen.
      if (event === 'USER_UPDATED') return;

      if (event === 'PASSWORD_RECOVERY') {
        // Belt-and-suspenders update after exchangeCodeForSession fires the event.
        set({ session, isInitializing: false, isPasswordRecovery: true });
        return;
      }

      set({ session, isInitializing: false });
    });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    set({ session: data.session });
    // Fire-and-forget — don't block or throw if the email fails
    fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
      },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .catch(() => {});
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session });
  },

  signInWithGoogle: async () => {
    GoogleSignin.configure({
      // Fallback to the hardcoded Web Client ID in case the env var is not set
      // (e.g. EAS builds that don't have EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID configured).
      // This is a public OAuth client ID — safe to commit.
      webClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
        '69435432358-hbc6erh9siq4m229rjdii7vc2ip7ibo4.apps.googleusercontent.com',
    });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    // User cancelled — not an error
    if (!isSuccessResponse(response)) return;
    // In v14 on Android, idToken may be null in the signIn response;
    // getTokens() is the reliable fallback to retrieve it.
    let idToken = response.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) throw new Error('No ID token returned from Google');
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
    // Send welcome email only on first-ever sign-in (new user)
    if (data.user) {
      const createdAt = new Date(data.user.created_at).getTime();
      const isNewUser = Date.now() - createdAt < 10_000;
      if (isNewUser) {
        fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          },
          body: JSON.stringify({ email: data.user.email }),
        })
          .then((r) => r.json())
          .catch(() => {});
      }
    }
    // Session will be set via onAuthStateChange listener
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'replygen://reset-password',
    });
    if (error) throw error;
  },

  clearPasswordRecovery: () => {
    set({ isPasswordRecovery: false });
  },

  deleteAccount: async () => {
    const { session } = get();
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to delete account.');
    }
    await supabase.auth.signOut();
    set({ session: null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },

  completeOnboarding: async () => {
    const { data, error } = await supabase.auth.updateUser({
      data: { onboardingComplete: true },
    });
    if (error) throw error;
    // Immediately patch the local session so _layout.tsx redirects without waiting
    // for onAuthStateChange (which fires asynchronously after updateUser).
    if (data.user) {
      set((state) => ({
        session: state.session ? { ...state.session, user: data.user } : null,
      }));
    }
  },
}));
