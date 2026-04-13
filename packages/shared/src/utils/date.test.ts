import { describe, it, expect } from 'vitest';
import { formatDateAEST, formatTimeAEST } from './date';

describe('date utils', () => {
  it('formats date correctly in AEST', () => {
    const iso = '2023-10-01T10:00:00Z';
    expect(formatDateAEST(iso)).toBe('Sunday 1 October 2023');
  });

  it('formats time correctly in AEST', () => {
    const iso = '2023-10-01T10:00:00Z';
    expect(formatTimeAEST(iso)).toBe('9:00 PM');
  });
});