export type LeadChangeReason =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.archived'
  | 'lead.restored'
  | 'lead.read'
  | 'lead.stack_archive'
  | 'lead.stack_evict'
  | 'lead.policy_updated'
  | (string & {}); // custom reasons, but keep autocomplete for the ones above

export type LeadChangeEvent = {
  type: 'leads_changed';
  reason: LeadChangeReason;
  at: string;
};

type Listener = (event: LeadChangeEvent) => void;

class LeadEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(reason: LeadChangeReason): LeadChangeEvent {
    const event: LeadChangeEvent = { type: 'leads_changed', reason, at: new Date().toISOString() };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* one bad subscriber must not kill the loop */
      }
    }
    return event;
  }

  get size(): number {
    return this.listeners.size;
  }
}

// one bus per process, so SSE only works on a single instance. redis pub/sub if that ever changes
const globalStore = globalThis as typeof globalThis & { __studioLeadEventBus?: LeadEventBus };

export const leadEvents: LeadEventBus =
  globalStore.__studioLeadEventBus ?? (globalStore.__studioLeadEventBus = new LeadEventBus());

export function notifyLeadsChanged(reason: LeadChangeReason): LeadChangeEvent {
  return leadEvents.emit(reason);
}
