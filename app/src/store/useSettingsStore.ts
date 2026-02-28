import { create } from 'zustand';
import { TonePreference } from '../types';

interface SettingsState {
  tone: TonePreference;
  setTone: (tone: TonePreference) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  tone: 'casual',
  setTone: (tone) => set({ tone }),
}));
