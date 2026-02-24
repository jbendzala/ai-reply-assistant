import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual: "Keep replies casual, relaxed, and conversational.",
  formal: "Keep replies professional, polite, and formal.",
  friendly: "Keep replies warm, upbeat, and friendly.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
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

  const openaiRes = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Given a message or conversation text, suggest 3 short, natural reply options. ${toneInstruction} Return only a JSON array of 3 strings, no other text.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await openaiRes.json();
  const content = data.choices[0]?.message?.content ?? "[]";
  const replies = JSON.parse(content);

  return new Response(JSON.stringify({ replies }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
