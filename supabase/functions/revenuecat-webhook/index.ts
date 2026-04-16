import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Events that grant Pro access
const PRO_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"]);
// Events that revoke Pro access
const REVOKE_EVENTS = new Set(["EXPIRATION", "BILLING_ISSUE"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // ── Verify RevenueCat shared secret ──────────────────────────────────────
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (!webhookSecret || (authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Parse payload ────────────────────────────────────────────────────────
    const body = await req.json();
    const event = body?.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { type, app_user_id: userId, id: transactionId } = event;

    if (!userId || !transactionId) {
      return new Response(JSON.stringify({ error: "Missing user_id or transaction_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ── Idempotency check ────────────────────────────────────────────────────
    const { data: existing } = await adminClient
      .from("revenuecat_webhooks")
      .select("transaction_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existing) {
      console.log("[revenuecat-webhook] already processed:", transactionId);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Update pro status in app_metadata ────────────────────────────────────
    // app_metadata can only be written by the service role — cannot be spoofed
    // by clients via supabase.auth.updateUser() (which writes user_metadata only).
    if (PRO_EVENTS.has(type)) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        app_metadata: { is_pro: true },
      });
      if (error) {
        console.error("[revenuecat-webhook] failed to set is_pro=true:", error.message);
      } else {
        console.log("[revenuecat-webhook] set is_pro=true for", userId, "event:", type);
      }
    } else if (REVOKE_EVENTS.has(type)) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        app_metadata: { is_pro: false },
      });
      if (error) {
        console.error("[revenuecat-webhook] failed to set is_pro=false:", error.message);
      } else {
        console.log("[revenuecat-webhook] set is_pro=false for", userId, "event:", type);
      }
    } else {
      console.log("[revenuecat-webhook] unhandled event type:", type, "— no action");
    }

    // ── Record for idempotency ───────────────────────────────────────────────
    await adminClient.from("revenuecat_webhooks").insert({
      transaction_id: transactionId,
      user_id: userId,
      event_type: type,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[revenuecat-webhook] unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
