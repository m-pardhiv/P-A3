export type Message = { to: string; subject: string; text: string }

const RESEND_URL = 'https://api.resend.com/emails'
const ERROR_LIMIT = 300

/**
 * Sends one email through Resend's HTTP API. It throws when Resend refuses or cannot be reached,
 * so callers treat it like any other mail failure: record it and let the person retry.
 * `from` must be on a domain verified in Resend (or onboarding@resend.dev for the account owner).
 */
export async function sendViaResend(
  config: { apiKey: string; from: string },
  message: Message,
  send: typeof fetch = fetch,
) {
  let response: Response
  try {
    response = await send(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    throw new Error(
      `Resend could not be reached: ${error instanceof Error ? error.message : error}`,
    )
  }

  if (!response.ok) {
    // Resend explains a refusal in the body, for example an unverified sender domain.
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(
      `Resend refused the email (${response.status}): ${(body?.message ?? 'no reason given').slice(0, ERROR_LIMIT)}`,
    )
  }
}
