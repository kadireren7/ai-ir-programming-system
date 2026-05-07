import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${cronSecret}`) return true;
  const vercelCron = request.headers.get("x-vercel-cron");
  return vercelCron === "1" && !!process.env.VERCEL;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable" }, { status: 503 });

  const now = new Date().toISOString();

  const { data: due, error } = await admin
    .from("report_schedules")
    .select("id, user_id, name, report_type, frequency, delivery_email, framework")
    .eq("enabled", true)
    .lte("next_send_at", now)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, message: "No due schedules" });
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const schedule of due) {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        results.push({ id: schedule.id as string, status: "skipped", error: "RESEND_API_KEY not configured" });
        failed += 1;
        continue;
      }

      const emailBody = buildEmailBody(schedule as ScheduleRow);
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Torqa Reports <reports@torqa.dev>",
          to: [schedule.delivery_email],
          subject: `Torqa ${String(schedule.report_type).replace("_", " ")} report — ${new Date().toLocaleDateString()}`,
          html: emailBody,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text().catch(() => "");
        results.push({ id: schedule.id as string, status: "failed", error: errText.slice(0, 200) });
        failed += 1;
      } else {
        results.push({ id: schedule.id as string, status: "sent" });
        sent += 1;
      }

      const nextSend = computeNextSend(schedule.frequency as string);
      await admin
        .from("report_schedules")
        .update({ next_send_at: nextSend, last_sent_at: now })
        .eq("id", schedule.id);
    } catch (e) {
      results.push({ id: schedule.id as string, status: "error", error: e instanceof Error ? e.message : "unknown" });
      failed += 1;
    }
  }

  return NextResponse.json({ processed: due.length, sent, failed, results });
}

type ScheduleRow = {
  id: string;
  user_id: string;
  name: string;
  report_type: string;
  frequency: string;
  delivery_email: string;
  framework: string | null;
};

function computeNextSend(frequency: string): string {
  const d = new Date();
  if (frequency === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

function buildEmailBody(schedule: ScheduleRow): string {
  const reportLabel = schedule.report_type.replace(/_/g, " ");
  const framework = schedule.framework && schedule.framework !== "both"
    ? schedule.framework.toUpperCase()
    : "SOC2 + ISO 27001";
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f12;color:#e5e5e5">
  <div style="margin-bottom:24px">
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280">Torqa</span>
    <h1 style="margin:4px 0 0;font-size:20px;font-weight:600;color:#f5f5f5">${reportLabel} Report</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
  <div style="border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:20px;background:#111827">
    <p style="margin:0;font-size:14px;color:#d1d5db">Schedule: <strong style="color:#f5f5f5">${schedule.name}</strong></p>
    <p style="margin:8px 0 0;font-size:14px;color:#d1d5db">Frequency: <strong style="color:#f5f5f5">${schedule.frequency}</strong></p>
    <p style="margin:8px 0 0;font-size:14px;color:#d1d5db">Framework: <strong style="color:#f5f5f5">${framework}</strong></p>
  </div>
  <p style="font-size:13px;color:#6b7280;margin:0">
    View your full compliance report in the
    <a href="https://app.torqa.dev/reports" style="color:#22d3ee;text-decoration:none">Torqa dashboard</a>.
  </p>
</div>
  `.trim();
}
