import { TonePreference } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-replies`;

export async function generateReplies(
  capturedText: string,
  tone: TonePreference,
): Promise<string[]> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ text: capturedText, tone }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data as { replies: string[] }).replies;
}

const MOCK_REPLIES: Record<TonePreference, string[][]> = {
  casual: [
    ["Sounds good!", "Yeah sure, works for me", "Cool, let's do it"],
    ["Haha no way!", "That's wild 😂", "Oh man, seriously?"],
    ["I'm down", "Let me check my schedule", "Can we do it later?"],
  ],
  formal: [
    ["That sounds agreeable.", "I concur with your proposal.", "Please proceed."],
    ["I appreciate you letting me know.", "Thank you for the update.", "Noted, I'll follow up."],
    ["I will review and respond shortly.", "Could we schedule a call to discuss?", "I'll confirm by end of day."],
  ],
  friendly: [
    ["Sounds great! 😊", "Oh I love that idea!", "Yes, absolutely!"],
    ["Haha that's so funny!", "That made my day 😄", "You're hilarious!"],
    ["I'd love to!", "Count me in! 🙌", "Let's make it happen!"],
  ],
};

export async function generateRepliesMock(
  _capturedText: string,
  tone: TonePreference,
): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const sets = MOCK_REPLIES[tone];
  return sets[Math.floor(Math.random() * sets.length)];
}
