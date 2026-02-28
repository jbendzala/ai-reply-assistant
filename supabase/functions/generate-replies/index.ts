import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const FREE_TIER_LIMIT = 50;

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

    // ── Auth verification ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Standard Supabase Edge Function pattern: create a user-scoped client by
    // forwarding the caller's Authorization header. Supabase verifies the JWT
    // natively and auth.getUser() returns the authenticated user.
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[generate-replies] auth error:", JSON.stringify(userError));
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Usage metering ───────────────────────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Atomically increment the usage count for this user/month
    const { error: rpcError } = await supabaseAdmin.rpc("increment_usage", {
      p_user_id: user.id,
      p_month: month,
    });

    if (rpcError) {
      // Table or RPC may not exist yet — log and continue without blocking
      console.error("[generate-replies] usage increment error:", JSON.stringify(rpcError));
    }

    // Read current count to enforce limit
    const { data: usageRow } = await supabaseAdmin
      .from("usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("month", month)
      .single();

    const currentCount = (usageRow?.count ?? 0) as number;
    if (currentCount > FREE_TIER_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Monthly scan limit of ${FREE_TIER_LIMIT} reached. Upgrade for unlimited scans.`,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Anthropic API call ───────────────────────────────────────────────────
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
    console.error("[generate-replies] unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
