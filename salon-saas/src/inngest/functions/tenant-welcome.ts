import { inngest } from "../client";
import { resend } from "@/lib/resend";

export const tenantWelcomeFn = inngest.createFunction(
  {
    id: "tenant-welcome",
    name: "Send Welcome Email to New Tenant",
    retries: 3,
  },
  { event: "tenant/created" },
  async ({ event, step }) => {
    const { email, salonName, trialDays } = event.data as {
      email: string;
      salonName: string;
      trialDays: number;
    };

    await step.run("send-welcome-email", async () => {
      if (!resend) {
        console.log("[tenant-welcome] Resend not configured, skipping email to", email);
        return;
      }
      await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: email,
        subject: `Welcome to the platform — ${salonName} is ready!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome, ${salonName}! 🎉</h1>
            <p>Your account is set up and ready. You have a <strong>${trialDays}-day free trial</strong>.</p>
            <p>Get started by completing your salon setup:</p>
            <a href="${process.env.NEXTAUTH_URL}/setup"
               style="background: #18181b; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Set Up Your Salon →
            </a>
            <p style="color: #666; margin-top: 24px;">Need help? Reply to this email.</p>
          </div>
        `,
      });
    });

    return { sent: true, email };
  }
);
