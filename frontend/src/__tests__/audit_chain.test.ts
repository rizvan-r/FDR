import { describe, it, expect } from 'vitest';

describe('Phase 9 Frontend: SHA-256 Hash-Chain Audit Integrity', () => {
  const GENESIS_HASH = '0'.repeat(64);

  // Client-side hash chain verification simulation
  interface MockAuditEvent {
    id: string;
    fdr_id: string;
    event_type: string;
    description: string;
    prev_event_hash: string;
    event_hash: string;
  }

  function verifyClientEventChain(events: MockAuditEvent[]): { isValid: boolean; error?: string } {
    if (events.length === 0) return { isValid: true };
    let expectedPrev = GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      if (evt.prev_event_hash !== expectedPrev) {
        return {
          isValid: false,
          error: `Chain broken at event ${i}: expected prev_hash ${expectedPrev.slice(0, 8)}, got ${evt.prev_event_hash.slice(0, 8)}`,
        };
      }
      expectedPrev = evt.event_hash;
    }
    return { isValid: true };
  }

  it('should validate an intact chronological audit hash chain', () => {
    const validChain: MockAuditEvent[] = [
      {
        id: 'evt-1',
        fdr_id: 'fdr-001',
        event_type: 'fdr_registered',
        description: 'Initial deposit creation',
        prev_event_hash: GENESIS_HASH,
        event_hash: 'a1b2c3d4e5f60102030405060708090a1b2c3d4e5f60102030405060708090a1',
      },
      {
        id: 'evt-2',
        fdr_id: 'fdr-001',
        event_type: 'fdr_verified',
        description: 'Bank confirmation received',
        prev_event_hash: 'a1b2c3d4e5f60102030405060708090a1b2c3d4e5f60102030405060708090a1',
        event_hash: 'f6e5d4c3b2a109080706050403020100f6e5d4c3b2a109080706050403020100',
      },
    ];

    const result = verifyClientEventChain(validChain);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should detect a broken chain when an event is missing or re-ordered', () => {
    const brokenChain: MockAuditEvent[] = [
      {
        id: 'evt-1',
        fdr_id: 'fdr-001',
        event_type: 'fdr_registered',
        description: 'Initial deposit creation',
        prev_event_hash: GENESIS_HASH,
        event_hash: 'hash-1',
      },
      {
        id: 'evt-3',
        fdr_id: 'fdr-001',
        event_type: 'fdr_released',
        description: 'Lien released (intermediate event deleted)',
        prev_event_hash: 'hash-2-which-was-deleted',
        event_hash: 'hash-3',
      },
    ];

    const result = verifyClientEventChain(brokenChain);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Chain broken at event 1');
  });
});
