import { getResend } from "./client";
import type { CreateEmailOptions } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Sends a transactional email via Resend.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = "noreply@factory.local",
  replyTo,
}: SendEmailOptions) {
  const resend = getResend();
  const recipients = Array.isArray(to) ? to : [to];

  let payload: CreateEmailOptions;
  if (html) {
    payload = {
      from,
      to: recipients,
      subject,
      html,
      replyTo,
      text: text || undefined,
    };
  } else {
    payload = {
      from,
      to: recipients,
      subject,
      text: text ?? "",
      replyTo,
    };
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  return data;
}
