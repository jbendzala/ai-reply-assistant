import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const FREE_TIER_LIMIT = 30;
const BODY_SIZE_LIMIT = 8_000; // bytes — stops giant OCR payloads from inflating input tokens
const BURST_INTERVAL_SECONDS = 3; // minimum seconds between scans per user

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual:
    "Tone: relaxed and natural, like texting a friend. Contractions and brief replies are fine.",
  formal:
    "Tone: professional and measured. Use complete sentences, no slang or abbreviations.",
  friendly:
    "Tone: warm and personable, but emotionally intelligent. Read the subtext — if the message is sarcastic, ironic, or playfully teasing, catch it and respond with a knowing, playful edge rather than blind positivity. Friendly doesn't mean oblivious.",
  witty:
    "Tone: light and clever. At least one of the 3 replies should have a playful or humorous spin.",
  flirty:
    "Tone: playful and subtly flirtatious — charming without being over the top. Use light teasing, warm compliments, or suggestive banter that fits the conversation. Keep it tasteful and context-appropriate; if the conversation is clearly professional or platonic, dial it back to just warm and charming.",
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

    // ── Body size guard ──────────────────────────────────────────────────────
    // Read the raw body once upfront so we can both size-check and parse it.
    const rawBody = await req.text();
    if (rawBody.length > BODY_SIZE_LIMIT) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
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

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error(
        "[generate-replies] auth error:",
        JSON.stringify(userError)
      );
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Parse + validate body ────────────────────────────────────────────────
    let text: string, tone: string;
    try {
      const body = JSON.parse(rawBody);
      text = body.text ?? "";
      tone = body.tone ?? "casual";
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Usage check (before incrementing) ───────────────────────────────────
    // Checking first ensures we never charge a blocked request against the quota.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    // Burst check: reject if the user scanned less than BURST_INTERVAL_SECONDS ago.
    const { data: usageRow } = await supabaseAdmin
      .from("usage")
      .select("count, last_scan_at")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();

    if (usageRow?.last_scan_at) {
      const secondsSinceLast =
        (Date.now() - new Date(usageRow.last_scan_at).getTime()) / 1_000;
      if (secondsSinceLast < BURST_INTERVAL_SECONDS) {
        return new Response(
          JSON.stringify({
            error: "Too many requests. Wait a moment before scanning again.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Monthly limit check (email-based count persists across account deletions).
    let currentCount = 0;
    if (user.email) {
      const { data: emailRow } = await supabaseAdmin
        .from("usage_by_email")
        .select("count")
        .eq("email", user.email)
        .eq("month", month)
        .maybeSingle();
      currentCount = (emailRow?.count ?? 0) as number;
    } else {
      currentCount = (usageRow?.count ?? 0) as number;
    }

    if (currentCount >= FREE_TIER_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Monthly scan limit of ${FREE_TIER_LIMIT} reached. Upgrade for unlimited scans.`,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Increment usage ──────────────────────────────────────────────────────
    const { error: rpcError } = await supabaseAdmin.rpc("increment_usage", {
      p_user_id: user.id,
      p_month: month,
      p_email: user.email ?? null,
    });

    if (rpcError) {
      // Table or RPC may not exist yet — log and continue without blocking
      console.error(
        "[generate-replies] usage increment error:",
        JSON.stringify(rpcError)
      );
    }

    // ── Anthropic API call ───────────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
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
- Match the length of the incoming message — if it's short (1–2 sentences), keep replies brief (1–10 words); if it's longer or more detailed, replies can be up to 25 words
- Make the 3 options meaningfully different from each other (vary length, directness, and angle)
- Sound like a real person texting — not a bot, not a template
- Mirror the register of the conversation: if the messages are professional or formal, avoid casual slang (fr, tbh, ngl, lol, etc.); if the conversation is casual, natural slang is fine
- Only use emojis if the scanned conversation already uses them
- Return ONLY a valid JSON array of 3 strings — no explanation, no markdown
- Empathy over transaction: when someone shares a problem or feels down, lead with understanding before jumping to solutions. Avoid cold phrasing like "what do you need?" — prefer "how can I help?" or "I'm here if you want to talk"
- Never assume gender: use gender-neutral language (they/them, "your friend", "that person") unless gender is explicitly stated in the conversation

${toneInstruction}`,
        messages: [{ role: "user", content: text }],
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
    const jsonStr = raw
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
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
