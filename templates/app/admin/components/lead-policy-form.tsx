'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadPolicy } from 'backend-blueprint';

export function LeadPolicyForm({ initial }: { initial: LeadPolicy }) {
  const [data, setData] = useState<LeadPolicy>(initial);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/leadPolicy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: data }),
      });
      if (res.ok) {
        const json = (await res.json()) as { archived?: number; deleted?: number };
        setMsg({
          type: 'ok',
          text: `Saved. Moved to archive: ${json.archived ?? 0}, permanently deleted: ${json.deleted ?? 0}.`,
        });
        router.refresh();
      } else {
        setMsg({ type: 'err', text: `Error ${res.status}` });
      }
    } catch {
      setMsg({ type: 'err', text: 'Network unavailable' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adm-list-block">
      <h2 className="adm-list-block__title">Leads: stack limits</h2>
      <p className="adm-field-hint" style={{ marginBottom: '1rem' }}>
        When the active pool overflows, the <strong>oldest</strong> lead moves to the archive. When
        the archive overflows, the oldest record is deleted, except successful deals
        (<strong>Won / Contract</strong>), which are never deleted automatically.
      </p>

      {msg && (
        <div className={`adm-alert adm-alert--${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.text}
        </div>
      )}

      <div className="adm-form">
        <div className="adm-field">
          <label htmlFor="maxActive">Max active leads</label>
          <input
            id="maxActive"
            type="number"
            min={10}
            max={50000}
            value={data.maxActive}
            onChange={(e) => setData((d) => ({ ...d, maxActive: Number(e.target.value) }))}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="maxArchived">Max archived leads</label>
          <input
            id="maxArchived"
            type="number"
            min={10}
            max={50000}
            value={data.maxArchived}
            onChange={(e) => setData((d) => ({ ...d, maxArchived: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="adm-actions">
        <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save limits'}
        </button>
      </div>
    </section>
  );
}
