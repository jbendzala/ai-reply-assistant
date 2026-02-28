import { generateReplies, generateRepliesMock } from "../services/aiService";
import { useAuthStore } from "../store/useAuthStore";
import { useReplyStore } from "../store/useReplyStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Reply } from "../types";

const SUPABASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function useReplyFlow() {
  const { setCapturedText, setSuggestions, setLoading, setError, reset } =
    useReplyStore();
  const { tone } = useSettingsStore();
  const session = useAuthStore((s) => s.session);

  async function startFlow(text: string) {
    console.log("[ReplyFlow] startFlow called with:", text);

    reset();
    setCapturedText(text);
    setLoading(true);

    try {
      const accessToken = session?.access_token;
      console.log("[ReplyFlow] SUPABASE_CONFIGURED:", SUPABASE_CONFIGURED, "hasToken:", !!accessToken);

      const rawReplies = SUPABASE_CONFIGURED && accessToken
        ? await generateReplies(text, tone, accessToken)
        : await generateRepliesMock(text, tone);

      console.log("[ReplyFlow] rawReplies:", rawReplies);

      const replies: Reply[] = rawReplies.map((r, i) => ({
        id: String(i),
        text: r,
      }));
      setSuggestions(replies);
    } catch (err) {
      console.error("[ReplyFlow] ERROR:", err);

      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isLoading = useReplyStore((s) => s.isLoading);

  return { startFlow, isLoading };
}
