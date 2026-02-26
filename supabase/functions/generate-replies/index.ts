const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual: "Keep replies casual, relaxed, and conversational.",
  formal: "Keep replies professional, polite, and formal.",
  friendly: "Keep replies warm, upbeat, and friendly.",
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
      max_tokens: 256,
      system: `You are a helpful assistant. Given a message or conversation text, suggest 3 short, natural reply options. ${toneInstruction} Return only a JSON array of 3 strings, no other text.`,
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
