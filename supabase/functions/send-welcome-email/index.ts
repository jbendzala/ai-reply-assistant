import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "AirReply <hello@airreply.app>";

const html = (email: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to AirReply</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0A0A0F;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#13131A;border-radius:16px;overflow:hidden;border:1px solid #2A2A3D;" cellpadding="0" cellspacing="0" role="presentation">

        <!-- Header -->
        <tr><td style="padding:40px 40px 32px;text-align:center;">
          <div style="display:inline-block;margin-bottom:24px;">
            <img src="https://jcujviegtkwqbybyrrqt.supabase.co/storage/v1/object/public/assets/AirReply_logo_dark.png" alt="AirReply" width="72" height="72" style="display:block;border:0;" />
          </div>
          <h1 style="color:#F0F0FF;font-size:24px;font-weight:700;margin:0 0 10px;letter-spacing:-0.3px;">Welcome to AirReply</h1>
          <p style="color:#8888AA;font-size:15px;line-height:1.65;margin:0;">
            Smart replies, instantly — right from a floating bubble on your screen.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#2A2A3D;"></div></td></tr>

        <!-- Steps -->
        <tr><td style="padding:32px 40px;">
          <p style="color:#55556A;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 20px;">Get started in 3 steps</p>

          <!-- Step 1 -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
            <tr>
              <td style="width:40px;height:40px;min-width:40px;background:#4F8EF7;border-radius:10px;text-align:center;color:#ffffff;font-size:16px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:40px;" valign="middle">1</td>
              <td style="padding-left:14px;color:#C8C8E8;font-size:14px;line-height:1.55;" valign="middle">
                Enable the <strong style="color:#F0F0FF;">floating bubble</strong> from the app, then open any chat app
              </td>
            </tr>
          </table>

          <!-- Step 2 -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
            <tr>
              <td style="width:40px;height:40px;min-width:40px;background:#4F8EF7;border-radius:10px;text-align:center;color:#ffffff;font-size:16px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:40px;" valign="middle">2</td>
              <td style="padding-left:14px;color:#C8C8E8;font-size:14px;line-height:1.55;" valign="middle">
                Tap the bubble — AI reads the conversation and <strong style="color:#F0F0FF;">labels who said what</strong>
              </td>
            </tr>
          </table>

          <!-- Step 3 -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="width:40px;height:40px;min-width:40px;background:#4F8EF7;border-radius:10px;text-align:center;color:#ffffff;font-size:16px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:40px;" valign="middle">3</td>
              <td style="padding-left:14px;color:#C8C8E8;font-size:14px;line-height:1.55;" valign="middle">
                Tap <strong style="color:#F0F0FF;">Copy</strong> to paste instantly, or <strong style="color:#F0F0FF;">Scan more</strong> for older context
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Tip banner -->
        <tr><td style="padding:0 40px 32px;">
          <div style="background:#0D1B4B;border-radius:10px;padding:16px 18px;border-left:3px solid #4F8EF7;">
            <p style="color:#8ABAFF;font-size:13px;font-weight:600;margin:0 0 4px;">
              <span style="color:#4F8EF7;margin-right:5px;">&#9733;</span>Pro tip
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:20px;vertical-align:top;padding-top:1px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </td>
                <td style="color:#8888AA;font-size:13px;line-height:1.55;">
                  When Android asks how to share your screen, choose <strong style="color:#C8C8E8;">Share whole screen</strong> — it gives AirReply the full conversation for smarter replies.
                </td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#2A2A3D;"></div></td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;text-align:center;">
          <p style="color:#55556A;font-size:13px;line-height:1.6;margin:0 0 6px;">
            Questions or feedback? Reply to this email — we read every one.
          </p>
          <p style="color:#3A3A50;font-size:12px;margin:0;">© 2026 AirReply · You're receiving this because you signed up at airreply.app</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

Deno.serve(async (req) => {
  // Allow the DB trigger (service role) and skip OPTIONS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[send-welcome-email] RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Dedup: skip if already sent within 24 hours
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: existing } = await supabaseAdmin
      .from("welcome_emails_sent")
      .select("sent_at")
      .eq("email", email)
      .maybeSingle();
    if (existing?.sent_at) {
      const hoursSince =
        (Date.now() - new Date(existing.sent_at).getTime()) / 3_600_000;
      if (hoursSince < 24) {
        console.log("[send-welcome-email] skipped duplicate for", email);
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Welcome to AirReply 👋",
        html: html(email),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[send-welcome-email] Resend error:", body);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    console.log("[send-welcome-email] sent to", email, "id:", data.id);

    // Record so future calls within 24 h are skipped
    await supabaseAdmin
      .from("welcome_emails_sent")
      .upsert({ email, sent_at: new Date().toISOString() }, { onConflict: "email" });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-welcome-email] unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
