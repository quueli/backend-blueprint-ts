import { captchaEnabled as envCaptchaEnabled } from '../env.js';

export { captchaEnabled } from '../env.js';

export async function verifyCaptcha(
  token: string | undefined,
  ip?: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!envCaptchaEnabled(env)) return true;
  if (!token) return false;
  try {
    if (env.TURNSTILE_SECRET) {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      });
      const j = (await r.json()) as { success?: boolean };
      return !!j.success;
    }
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.RECAPTCHA_SECRET!,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const j = (await r.json()) as { success?: boolean; score?: number };
    const minScore = Number(env.RECAPTCHA_MIN_SCORE ?? 0.5);
    return !!j.success && (j.score === undefined || j.score >= minScore);
  } catch {
    return false;
  }
}
