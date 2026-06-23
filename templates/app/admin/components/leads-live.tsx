'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatBadgeCount } from 'backend-blueprint';
import { setFaviconBadge } from './favicon-badge';

type ConnStatus = 'connecting' | 'live' | 'offline';

const MUTE_KEY = 'leadsSoundMuted';

export function LeadsLive({ initialUnread = 0 }: { initialUnread?: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [unread, setUnread] = useState(initialUnread);
  const [muted, setMuted] = useState(false);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setMuted(typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1');
  }, []);

  useEffect(() => {
    setFaviconBadge(unread);
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = unread > 0 ? `(${formatBadgeCount(unread)}) ${base}` : base;
  }, [unread]);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads/unread', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { count?: number };
        setUnread(data.count ?? 0);
      }
    } catch {
      /* ignore, SSE will trigger another refresh */
    }
  }, []);

  const playBeep = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const Ctx: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      /* audio not available */
    }
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/admin/leads/stream');

    es.onopen = () => setStatus('live');
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as { type?: string; reason?: string };
        if (data.type === 'leads_changed') {
          if (data.reason === 'lead.created') playBeep();
          void refreshUnread();
          router.refresh();
        }
      } catch {
        /* ignore malformed events */
      }
    };
    es.onerror = () => {
      setStatus('offline');
      es.close();
    };

    return () => es.close();
  }, [router, playBeep, refreshUnread]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      // a click counts as a user gesture, so the audio context can be unlocked here
      if (!next) void audioRef.current?.resume();
      return next;
    });
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/leads/unread', { method: 'POST' });
      setUnread(0);
      router.refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <span className="adm-leads-live">
      <span
        className={`adm-live-badge adm-live-badge--${status}`}
        title={status === 'live' ? 'Leads update automatically' : 'No live connection'}
      >
        {status === 'live' ? '● Live' : status === 'offline' ? '○ Offline' : '… Connecting'}
      </span>

      {unread > 0 && (
        <button type="button" className="adm-unread-badge" onClick={markAllRead} title="Mark all as read">
          {formatBadgeCount(unread)} unread
        </button>
      )}

      <button type="button" className="adm-btn adm-btn--sm" onClick={toggleMute} aria-pressed={muted}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
    </span>
  );
}
