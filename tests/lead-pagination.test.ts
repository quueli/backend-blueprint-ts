import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePagination,
  parsePageParam,
  parsePageSizeParam,
  clampPage,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../src/leads/pagination.js';

describe('parsePageParam', () => {
  it('defaults to 1', () => {
    assert.equal(parsePageParam(undefined), 1);
    assert.equal(parsePageParam(null), 1);
    assert.equal(parsePageParam(''), 1);
  });
  it('rejects zero / negative / NaN', () => {
    assert.equal(parsePageParam('0'), 1);
    assert.equal(parsePageParam('-3'), 1);
    assert.equal(parsePageParam('abc'), 1);
  });
  it('parses valid page', () => {
    assert.equal(parsePageParam('4'), 4);
  });
});

describe('parsePageSizeParam', () => {
  it('defaults when missing/invalid', () => {
    assert.equal(parsePageSizeParam(undefined), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSizeParam('0'), DEFAULT_PAGE_SIZE);
    assert.equal(parsePageSizeParam('nope'), DEFAULT_PAGE_SIZE);
  });
  it('caps at MAX_PAGE_SIZE', () => {
    assert.equal(parsePageSizeParam('500'), MAX_PAGE_SIZE);
    assert.equal(clampPageSize(10_000), MAX_PAGE_SIZE);
  });
  it('keeps valid size', () => {
    assert.equal(parsePageSizeParam('25'), 25);
  });
});

describe('clampPage', () => {
  it('clamps into [1, totalPages]', () => {
    assert.equal(clampPage(5, 3), 3);
    assert.equal(clampPage(0, 3), 1);
    assert.equal(clampPage(2, 3), 2);
    assert.equal(clampPage(NaN, 3), 1);
  });
});

describe('computePagination', () => {
  it('handles empty result', () => {
    const p = computePagination({ total: 0, page: 1, pageSize: 20 });
    assert.equal(p.totalPages, 1);
    assert.equal(p.page, 1);
    assert.equal(p.skip, 0);
    assert.equal(p.hasPrev, false);
    assert.equal(p.hasNext, false);
  });

  it('computes window and clamps overflow page', () => {
    const p = computePagination({ total: 45, page: 99, pageSize: 20 });
    assert.equal(p.totalPages, 3);
    assert.equal(p.page, 3); // clamped
    assert.equal(p.skip, 40);
    assert.equal(p.take, 20);
    assert.equal(p.hasPrev, true);
    assert.equal(p.hasNext, false);
  });

  it('never exceeds MAX_PAGE_SIZE', () => {
    const p = computePagination({ total: 1_000_000, page: 1, pageSize: 999_999 });
    assert.equal(p.take, MAX_PAGE_SIZE);
    assert.equal(p.pageSize, MAX_PAGE_SIZE);
  });
});
