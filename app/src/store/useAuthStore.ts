import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  /** True only during the initial getSession() call on app start. */
  isInitializing: boolean;
  initialize: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isInitializing: true,

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, isInitializing: false });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, isInitializing: false });
    });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    set({ session: data.session });
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
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
    // Session will be set via onAuthStateChange listener
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
