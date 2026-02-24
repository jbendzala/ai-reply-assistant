import { generateReplies, generateRepliesMock } from '../services/aiService';
import { useReplyStore } from '../store/useReplyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Reply } from '../types';

const SUPABASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function useReplyFlow() {
  const { setCapturedText, setSuggestions, setLoading, setError, reset } = useReplyStore();
  const { tone } = useSettingsStore();

  async function startFlow(text: string) {
    reset();
    setCapturedText(text);
    setLoading(true);

    try {
      const rawReplies = SUPABASE_CONFIGURED
        ? await generateReplies(text, tone)
        : await generateRepliesMock(text, tone);

      const replies: Reply[] = rawReplies.map((r, i) => ({ id: String(i), text: r }));
      setSuggestions(replies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const isLoading = useReplyStore((s) => s.isLoading);

  return { startFlow, isLoading };
}
