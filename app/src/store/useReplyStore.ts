import { create } from 'zustand';

interface Reply {
  id: string;
  text: string;
}

interface ReplyState {
  capturedText: string | null;
  suggestions: Reply[];
  isLoading: boolean;
  error: string | null;
  setCapturedText: (text: string) => void;
  setSuggestions: (suggestions: Reply[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useReplyStore = create<ReplyState>((set) => ({
  capturedText: null,
  suggestions: [],
  isLoading: false,
  error: null,

  setCapturedText: (text) => set({ capturedText: text }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ capturedText: null, suggestions: [], isLoading: false, error: null }),
}));
