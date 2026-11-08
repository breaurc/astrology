/**
 * Transactional email (verification links). Uses the Resend HTTP API when RESEND_API_KEY and MAIL_FROM are set;
 * otherwise the message is printed to the server log, which is enough for development.
 */
export interface Mail { to: string; subject: string; text: string; }

function mailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(m: Mail): Promise<{ delivered: boolean }> {
  if (!mailConfigured()) {
    console.log(`[mail] (not configured) to=${m.to} subject="${m.subject}"\n${m.text}`);
    return { delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`[mail] resend ${res.status}: ${await res.text()}`);
    return { delivered: false };
  }
  return { delivered: true };
}
