export async function pushToCrm(
  lead: Record<string, unknown>,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const url = env.CRM_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(lead),
    });
  } catch (e) {
    console.error('crm webhook failed', e);
  }
}
