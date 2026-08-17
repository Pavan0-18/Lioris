import { resend, FROM_EMAIL } from "@/lib/resend";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    return { sent: false, error: "Resend not configured (set RESEND_API_KEY)" };
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err: any) {
    console.error("[Email] Send failed:", err?.message || err);
    return { sent: false, error: err?.message || "Unknown error" };
  }
}

function layout(content: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.08em; color: #18181b;">LIORIS</span>
    </div>
    <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 32px;">
      ${content}
    </div>
    <p style="text-align: center; font-size: 12px; color: #a1a1aa; margin-top: 24px;">
      Lioris — Beauty Platform · You are receiving this email because you booked an appointment.
    </p>
  </div>`;
}

export function appointmentReminderHtml(opts: {
  customerName: string;
  salonName: string;
  dateTime: string;
  services: string[];
  staffName?: string | null;
  checkInCode?: string | null;
}): string {
  const serviceList = opts.services
    .map((s) => `<li style="margin: 4px 0;">${s}</li>`)
    .join("");

  return layout(`
    <h1 style="font-size: 20px; color: #18181b; margin: 0 0 8px;">Hi ${opts.customerName},</h1>
    <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px;">
      This is a friendly reminder about your upcoming appointment at
      <strong>${opts.salonName}</strong> on <strong>${opts.dateTime}</strong>.
    </p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
      <div style="font-size: 13px; font-weight: 600; color: #18181b; margin-bottom: 6px;">Appointment details</div>
      ${opts.staffName ? `<div style="font-size: 13px; color: #52525b;">Stylist: ${opts.staffName}</div>` : ""}
      ${serviceList ? `<ul style="font-size: 13px; color: #52525b; margin: 8px 0 0; padding-left: 18px;">${serviceList}</ul>` : ""}
    </div>
    ${opts.checkInCode ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 12px; color: #71717a; margin-bottom: 6px;">Your check-in code</div>
      <div style="display: inline-block; font-size: 24px; font-weight: 700; letter-spacing: 0.2em; color: #18181b; background: #f4f4f5; border-radius: 8px; padding: 10px 20px;">${opts.checkInCode}</div>
    </div>` : ""}
    <p style="color: #52525b; line-height: 1.6; margin: 0;">
      Please arrive 5 minutes early. Need to make changes?
      <a href="${process.env.NEXTAUTH_URL || ""}" style="color: #18181b;">Contact your salon</a>.
    </p>
  `);
}

export function bulkNotifyHtml(opts: { title: string; message: string }): string {
  return layout(`
    <h1 style="font-size: 20px; color: #18181b; margin: 0 0 8px;">${opts.title}</h1>
    <p style="color: #52525b; line-height: 1.6; margin: 0; white-space: pre-wrap;">${opts.message}</p>
  `);
}

export function customerMessageHtml(opts: { customerName: string; salonName: string; message: string }): string {
  return layout(`
    <p style="color: #52525b; line-height: 1.6; margin: 0 0 16px;">Hi ${opts.customerName},</p>
    <p style="color: #52525b; line-height: 1.6; margin: 0 0 16px; white-space: pre-wrap;">${opts.message}</p>
    <p style="color: #a1a1aa; font-size: 13px; margin: 0;">— ${opts.salonName}</p>
  `);
}