import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canEditLead, isLeadLocked, ownerLabel } from '../src/leads/access.js';

describe('canEditLead', () => {
  it('requires a user id', () => {
    assert.equal(canEditLead({ ownerId: null, status: 'NEW' }, undefined, 'OWNER'), false);
  });
  it('allows editing of unassigned leads', () => {
    assert.equal(canEditLead({ ownerId: null, status: 'NEW' }, 'u1', 'EDITOR'), true);
  });
  it('OWNER can edit anyone’s lead', () => {
    assert.equal(canEditLead({ ownerId: 'u2', status: 'NEW' }, 'u1', 'OWNER'), true);
  });
  it('EDITOR cannot edit another owner’s lead', () => {
    assert.equal(canEditLead({ ownerId: 'u2', status: 'NEW' }, 'u1', 'EDITOR'), false);
  });
});

describe('isLeadLocked', () => {
  it('unassigned is never locked', () => {
    assert.equal(isLeadLocked({ ownerId: null, status: 'NEW' }, 'u1', 'EDITOR'), false);
  });
  it('locked for non-owner EDITOR, open for OWNER', () => {
    assert.equal(isLeadLocked({ ownerId: 'u2', status: 'NEW' }, 'u1', 'EDITOR'), true);
    assert.equal(isLeadLocked({ ownerId: 'u2', status: 'NEW' }, 'u1', 'OWNER'), false);
  });
});

describe('ownerLabel', () => {
  it('returns the owner name or null', () => {
    assert.equal(ownerLabel({ name: 'Manager' }), 'Manager');
    assert.equal(ownerLabel(null), null);
    assert.equal(ownerLabel(undefined), null);
  });
});
