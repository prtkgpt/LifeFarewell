import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const isSandbox = process.env.SANDBOX_MODE === "true";

  if (isSandbox) {
    console.log("[SANDBOX] Email would be sent:", params);
    return {
      id: `sim_${Date.now()}`,
      status: "SIMULATED" as const,
    };
  }

  const { data, error } = await resend.emails.send({
    from: params.from || process.env.RESEND_FROM || "noreply@example.com",
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return {
    id: data?.id || "",
    status: "SENT" as const,
  };
}
