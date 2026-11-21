// packages/api/src/theology-library/__tests__/search.test.ts
import { describe, expect, it, vi } from 'vitest';

import type {
  PassageRow,
  TheologyLibraryRepository,
} from '../../db/theology-library.repository.js';
import type { EmbeddingService } from '../../engine/embeddings/embedding.service.js';
import {
  MAX_VECTOR_DISTANCE,
  TheologySearchService,
  displayRefs,
  fuse,
} from '../search.service.js';

const row = (id: string, metric: number, refs: string[] = []): PassageRow => ({
  chunkId: id,
  sourceId: `src-${id}`,
  sourceTitle: `Title ${id}`,
  author: null,
  kind: 'book',
  page: 1,
  heading: '',
  text: `text ${id}`,
  scriptureRefs: refs,
  metric,
});

describe('fuse', () => {
  it('ranks passages found by several retrievers first', () => {
    const result = fuse([row('a', 0.3), row('b', 0.4)], [row('b', 0.9)], [row('b', 0)]);
    expect(result.map((p) => p.chunkId)).toEqual(['b', 'a']);
  });

  it('drops meaning-only matches that are not close enough', () => {
    const far = MAX_VECTOR_DISTANCE + 0.05;
    expect(fuse([row('a', far)], [], [])).toEqual([]);
    // …unless a keyword or reference search also found it.
    expect(fuse([row('a', far)], [row('a', 0.7)], []).map((p) => p.chunkId)).toEqual(['a']);
  });

  it('shows verse references, keeping chapter-only ones', () => {
    const [p] = fuse([row('a', 0.2, ['JHN 3', 'JHN 3:16', 'ROM 8'])], [], []);
    expect(p?.scriptureRefs).toEqual(['JHN 3:16', 'ROM 8']);
    expect(displayRefs([])).toEqual([]);
  });
});

describe('TheologySearchService', () => {
  function make() {
    const repo = {
      searchByVector: vi.fn(async () => [row('a', 0.2)]),
      searchByKeyword: vi.fn(async () => [row('b', 0.8)]),
      searchByRefs: vi.fn(async () => [] as PassageRow[]),
    };
    const embeddings = { embedOne: vi.fn(async () => [0.1, 0.2]) };
    const service = new TheologySearchService(
      repo as unknown as TheologyLibraryRepository,
      embeddings as unknown as EmbeddingService,
    );
    return { service, repo, embeddings };
  }

  it('runs all three searches with the filters and trims to topK', async () => {
    const { service, repo, embeddings } = make();
    const result = await service.search({
      query: 'What does Romans 8:28 mean?',
      topK: 1,
      doctrineTags: ['reformed'],
      userId: 'u1',
      usageTag: 'tag',
    });
    expect(embeddings.embedOne).toHaveBeenCalledWith('What does Romans 8:28 mean?', 'u1', 'tag');
    const filter = { kinds: undefined, doctrineTags: ['reformed'] };
    expect(repo.searchByVector).toHaveBeenCalledWith([0.1, 0.2], filter, 30);
    expect(repo.searchByRefs).toHaveBeenCalledWith(['ROM 8'], filter, 30);
    expect(result).toHaveLength(1);
  });
});
