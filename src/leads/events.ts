export type LeadChangeEvent = {
  type: 'leads_changed';
  reason: string;
  at: string;
};

type Listener = (event: LeadChangeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeLeadEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLeadsChanged(reason: string): LeadChangeEvent {
  const event: LeadChangeEvent = { type: 'leads_changed', reason, at: new Date().toISOString() };
  for (const listener of listeners) {
    listener(event);
  }
  return event;
}
