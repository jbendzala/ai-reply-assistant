import { create } from 'zustand';
import { TonePreference } from '../types';

interface SettingsState {
  tone: TonePreference;
  onboardingComplete: boolean;
  setTone: (tone: TonePreference) => void;
  completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  tone: 'casual',
  onboardingComplete: false,
  setTone: (tone) => set({ tone }),
  completeOnboarding: () => set({ onboardingComplete: true }),
}));
