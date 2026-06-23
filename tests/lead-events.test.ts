import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leadEvents, notifyLeadsChanged, type LeadChangeEvent } from '../src/leads/events.js';

describe('lead event bus', () => {
  it('fans out to subscribers and stops after unsubscribe', () => {
    const received: LeadChangeEvent[] = [];
    const unsubscribe = leadEvents.subscribe((e) => received.push(e));

    const event = notifyLeadsChanged('lead.created');
    assert.equal(event.type, 'leads_changed');
    assert.equal(event.reason, 'lead.created');
    assert.ok(event.at, 'event carries an ISO timestamp');
    assert.equal(received.length, 1);
    assert.equal(received[0].reason, 'lead.created');

    unsubscribe();
    notifyLeadsChanged('lead.updated');
    assert.equal(received.length, 1, 'no delivery after unsubscribe');
  });

  it('keeps emitting even if a subscriber throws', () => {
    const ok: LeadChangeEvent[] = [];
    const offBad = leadEvents.subscribe(() => {
      throw new Error('boom');
    });
    const offGood = leadEvents.subscribe((e) => ok.push(e));

    assert.doesNotThrow(() => notifyLeadsChanged('lead.archived'));
    assert.equal(ok.length, 1);

    offBad();
    offGood();
  });

  it('tracks subscriber count and forwards custom reasons', () => {
    const before = leadEvents.size;
    const off = leadEvents.subscribe(() => {});
    assert.equal(leadEvents.size, before + 1);
    const e = notifyLeadsChanged('custom.reason');
    assert.equal(e.reason, 'custom.reason');
    off();
    assert.equal(leadEvents.size, before);
  });
});
