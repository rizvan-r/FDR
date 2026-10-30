import { describe, it, expect } from 'vitest';

describe('Phase 9 Frontend: Lineage Graph Traversal & Renewal Candidate Matching', () => {
  interface LineageNode {
    id: string;
    predecessor_id: string | null;
    fdr_number: string;
  }

  function detectCycle(nodes: LineageNode[], newChildId: string, newParentId: string): boolean {
    if (newChildId === newParentId) return true;
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      if (currentId === newChildId) return true;
      const node = nodes.find((n) => n.id === currentId);
      currentId = node?.predecessor_id || null;
    }
    return false;
  }

  function calculateCandidateMatchScore(params: {
    amount1: number;
    amount2: number;
    bankId1: string;
    bankId2: string;
    instId1: string;
    instId2: string;
  }): { score: number; confidence: 'high' | 'medium' | 'low' } {
    if (params.instId1 !== params.instId2) {
      return { score: 0, confidence: 'low' }; // Strict cross-institution isolation
    }
    let score = 0;
    if (params.bankId1 === params.bankId2) score += 40;
    const amtDiff = Math.abs(params.amount1 - params.amount2);
    if (amtDiff === 0) {
      score += 40;
    } else if (amtDiff / params.amount1 < 0.1) {
      score += 25;
    } else {
      score += 10;
    }
    score += 20; // Structural metadata match

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (score >= 80) confidence = 'high';
    else if (score >= 50) confidence = 'medium';

    return { score, confidence };
  }

  it('should detect cycles when linking predecessors and successors', () => {
    const nodes: LineageNode[] = [
      { id: 'fdr-1', predecessor_id: null, fdr_number: 'FDR-001' },
      { id: 'fdr-2', predecessor_id: 'fdr-1', fdr_number: 'FDR-002' },
      { id: 'fdr-3', predecessor_id: 'fdr-2', fdr_number: 'FDR-003' },
    ];

    // Attempting to make fdr-1's predecessor fdr-3 creates a cycle: 1 -> 2 -> 3 -> 1
    const hasCycle = detectCycle(nodes, 'fdr-1', 'fdr-3');
    expect(hasCycle).toBe(true);

    // Self link: fdr-1 -> fdr-1
    const selfCycle = detectCycle(nodes, 'fdr-1', 'fdr-1');
    expect(selfCycle).toBe(true);

    // Valid forward extension: fdr-4 predecessor is fdr-3
    const validLink = detectCycle(nodes, 'fdr-4', 'fdr-3');
    expect(validLink).toBe(false);
  });

  it('should strictly isolate candidate matching between different institutions', () => {
    const match = calculateCandidateMatchScore({
      amount1: 5000000,
      amount2: 5000000,
      bankId1: 'bank-01',
      bankId2: 'bank-01',
      instId1: 'inst-01',
      instId2: 'inst-02', // Different institutions!
    });

    expect(match.score).toBe(0);
    expect(match.confidence).toBe('low');
  });

  it('should compute high confidence score for same bank, same institution, and identical amount', () => {
    const match = calculateCandidateMatchScore({
      amount1: 5000000,
      amount2: 5000000,
      bankId1: 'bank-01',
      bankId2: 'bank-01',
      instId1: 'inst-01',
      instId2: 'inst-01',
    });

    expect(match.score).toBe(100);
    expect(match.confidence).toBe('high');
  });
});
