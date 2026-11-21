// packages/api/src/theology-library/search.service.ts
//
// Hybrid search over APPROVED sources: meaning (pgvector), keywords (trigram)
// and Scripture references, merged with reciprocal-rank fusion. A passage
// found only by meaning must also be reasonably close, so an unrelated
// question returns nothing rather than the "least unrelated" passages.
import { Injectable } from '@nestjs/common';
import type { TheologyPassage, TheologySearchData, TheologySourceKind } from '@clawix/shared';

import { EmbeddingService } from '../engine/embeddings/embedding.service.js';
import {
  TheologyLibraryRepository,
  type PassageFilter,
  type PassageRow,
} from '../db/theology-library.repository.js';
import { chapterKeys, extractScriptureRefs } from './scripture-refs.js';

/** Candidates fetched from each retriever before fusion. */
const CANDIDATES = 30;
/** RRF constant — the usual 60 flattens rank differences within a list. */
const RRF_K = 60;
/**
 * Cosine distance above which a meaning-only match is dropped. With
 * text-embedding-3-small, on-topic passages typically sit around 0.35–0.6.
 */
export const MAX_VECTOR_DISTANCE = 0.68;

export interface SearchRequest extends TheologySearchData {
  readonly userId: string;
  readonly usageTag: string;
}

@Injectable()
export class TheologySearchService {
  constructor(
    private readonly repo: TheologyLibraryRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  async search(req: SearchRequest): Promise<TheologyPassage[]> {
    const filter: PassageFilter = { kinds: req.kinds, doctrineTags: req.doctrineTags };
    const keys = chapterKeys(extractScriptureRefs(req.query));
    const vector = await this.embeddings.embedOne(req.query, req.userId, req.usageTag);

    const [byVector, byKeyword, byRef] = await Promise.all([
      this.repo.searchByVector(vector, filter, CANDIDATES),
      this.repo.searchByKeyword(req.query, filter, CANDIDATES),
      this.repo.searchByRefs(keys, filter, CANDIDATES),
    ]);
    return fuse(byVector, byKeyword, byRef).slice(0, req.topK);
  }
}

/** Drop a chapter key ("ROM 8") when a verse key in that chapter ("ROM 8:28") is present. */
export function displayRefs(refs: readonly string[]): string[] {
  return refs.filter((r) => r.includes(':') || !refs.some((o) => o.startsWith(`${r}:`)));
}

/** Reciprocal-rank fusion; exported for tests. */
export function fuse(
  byVector: readonly PassageRow[],
  byKeyword: readonly PassageRow[],
  byRef: readonly PassageRow[],
): TheologyPassage[] {
  const scored = new Map<string, { row: PassageRow; score: number; close: boolean }>();
  const add = (rows: readonly PassageRow[], isVector: boolean) => {
    rows.forEach((row, rank) => {
      const entry = scored.get(row.chunkId) ?? { row, score: 0, close: false };
      entry.score += 1 / (RRF_K + rank + 1);
      // Keyword and reference hits are evidence on their own; vector hits must be close.
      entry.close ||= !isVector || Number(row.metric) <= MAX_VECTOR_DISTANCE;
      scored.set(row.chunkId, entry);
    });
  };
  add(byVector, true);
  add(byKeyword, false);
  add(byRef, false);

  return [...scored.values()]
    .filter((e) => e.close)
    .sort((a, b) => b.score - a.score)
    .map(({ row, score }) => ({
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle,
      author: row.author,
      kind: row.kind as TheologySourceKind,
      page: row.page,
      heading: row.heading,
      text: row.text,
      scriptureRefs: displayRefs(row.scriptureRefs),
      score: Number(score.toFixed(5)),
    }));
}
