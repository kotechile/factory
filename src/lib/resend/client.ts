import { Resend } from "resend";

let resendInstance: Resend | null = null;

/**
 * Returns a singleton instance of the Resend client.
 * Throws explicit error if RESEND_API_KEY is not configured.
 */
export function getResend(): Resend {
  if (resendInstance) {
    return resendInstance;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY environment variable. Ensure it is set in your environment.",
    );
  }

  resendInstance = new Resend(apiKey);
  return resendInstance;
}
