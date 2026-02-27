const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual: "Tone: relaxed and natural, like texting a friend. Contractions and brief replies are fine.",
  formal: "Tone: professional and measured. Use complete sentences, no slang or abbreviations.",
  friendly: "Tone: warm, upbeat, and personable. Add genuine positive energy where it fits naturally.",
  witty: "Tone: light and clever. At least one of the 3 replies should have a playful or humorous spin.",
};

Deno.serve(async (req) => {
  try {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "Anthropic key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text, tone = "casual" } = await req.json();

  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.casual;

  const anthropicRes = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `You are a messaging assistant helping someone reply to a conversation on their phone.

The text below was OCR-scanned from their screen — focus on the most recent incoming message.

Rules:
- Generate exactly 3 reply options
- Keep each reply under 20 words
- Make the 3 options meaningfully different from each other (vary length, directness, and angle)
- Sound like a real person texting — not a bot, not a template
- Only use emojis if the scanned conversation already uses them
- Return ONLY a valid JSON array of 3 strings — no explanation, no markdown

${toneInstruction}`,
      messages: [
        { role: "user", content: text },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await anthropicRes.json();
  const raw = data.content[0]?.text ?? "[]";
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const replies = JSON.parse(jsonStr);

  return new Response(JSON.stringify({ replies }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
