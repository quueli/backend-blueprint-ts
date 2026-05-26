export const HONEYPOT_FIELD = 'website';

export function isHoneypotTriggered(value: string | undefined | null): boolean {
  return !!(value && value.length > 0);
}
