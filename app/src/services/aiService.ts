// AI Reply service — calls OpenAI API to generate reply suggestions
// Replace OPENAI_API_KEY with your actual key (via environment variable)

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generateReplies(capturedText: string): Promise<string[]> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Given a message or conversation screenshot text, suggest 3 short, natural reply options. Return only a JSON array of strings.',
        },
        {
          role: 'user',
          content: `Suggest replies for: ${capturedText}`,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? '[]';
  return JSON.parse(content) as string[];
}
