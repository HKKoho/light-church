import { describe, expect, it } from 'vitest';

import {
  THEOLOGY_CURATOR_ROLES,
  THEOLOGY_READER_ROLES,
  reviewReadingSourceSchema,
  theologyAskSchema,
  theologySearchSchema,
  uploadReadingSourceSchema,
} from '../theology-library.schema.js';

const upload = {
  title: ' Institutes ',
  kind: 'systematic',
  language: 'en',
  fileName: 'institutes.pdf',
  mimeType: 'application/pdf',
  base64: 'JVBERi0=',
  copyrightConfirmed: true,
};

describe('theology library schemas', () => {
  it('accepts an upload, trimming text and dropping empty optionals', () => {
    const parsed = uploadReadingSourceSchema.parse({ ...upload, author: '  ' });
    expect(parsed.title).toBe('Institutes');
    expect(parsed.author).toBeUndefined();
  });

  it('requires the copyright confirmation and a known file type', () => {
    expect(
      uploadReadingSourceSchema.safeParse({ ...upload, copyrightConfirmed: false }).success,
    ).toBe(false);
    expect(uploadReadingSourceSchema.safeParse({ ...upload, mimeType: 'image/png' }).success).toBe(
      false,
    );
    expect(uploadReadingSourceSchema.safeParse({ ...upload, base64: 'not base64!' }).success).toBe(
      false,
    );
  });

  it('requires a note to reject, not to approve', () => {
    expect(
      reviewReadingSourceSchema.safeParse({ status: 'rejected', doctrineTags: [] }).success,
    ).toBe(false);
    expect(
      reviewReadingSourceSchema.safeParse({
        status: 'rejected',
        doctrineTags: [],
        reviewNote: 'Off topic',
      }).success,
    ).toBe(true);
    expect(
      reviewReadingSourceSchema.safeParse({ status: 'approved', doctrineTags: ['reformed'] })
        .success,
    ).toBe(true);
    expect(
      reviewReadingSourceSchema.safeParse({ status: 'approved', doctrineTags: ['gnostic'] })
        .success,
    ).toBe(false);
  });

  it('defaults search and ask options', () => {
    expect(theologySearchSchema.parse({ query: 'grace' }).topK).toBe(6);
    expect(theologySearchSchema.safeParse({ query: 'grace', topK: 50 }).success).toBe(false);
    const ask = theologyAskSchema.parse({ question: 'What is grace?' });
    expect(ask).toMatchObject({ mode: 'general', language: 'zh-TW', history: [] });
  });

  it('lets every curator read', () => {
    for (const role of THEOLOGY_CURATOR_ROLES) expect(THEOLOGY_READER_ROLES).toContain(role);
    expect(THEOLOGY_READER_ROLES).not.toContain('volunteer');
  });
});
