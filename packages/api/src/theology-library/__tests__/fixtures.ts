// packages/api/src/theology-library/__tests__/fixtures.ts
import type { ReadingSource } from '../../generated/prisma/client.js';
import type { Actor } from '../theology-library.service.js';

export const pastor: Actor = { id: 'pastor-1', role: 'pastor' };
export const deacon: Actor = { id: 'deacon-1', role: 'deacon' };
export const volunteer: Actor = { id: 'vol-1', role: 'volunteer' };

export function sourceRow(overrides: Partial<ReadingSource> = {}): ReadingSource {
  const at = new Date('2026-11-21T00:00:00Z');
  return {
    id: 'src-1',
    title: 'Institutes',
    author: 'Calvin',
    kind: 'systematic',
    language: 'en',
    fileName: 'institutes.pdf',
    fileSizeBytes: 1024,
    pageCount: 10,
    ocrPagesUsed: 0,
    content: '## Page 1\n\nKnowledge of God and of ourselves.',
    status: 'pending_review',
    statusDetail: null,
    doctrineTags: [],
    copyrightConfirmed: true,
    copyrightNote: 'Public domain',
    reviewNote: null,
    reviewedById: null,
    reviewedAt: null,
    uploadedById: 'pastor-1',
    chunkCount: 1,
    embeddingModel: 'text-embedding-3-small',
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}
