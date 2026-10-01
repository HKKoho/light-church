// packages/api/src/help-assistant/__tests__/document-text.test.ts
import { describe, expect, it, vi } from 'vitest';
import { HELP_ASSISTANT_MAX_ATTACHMENT_CHARS } from '@clawix/shared';

const getText = vi.fn(async () => ({ text: 'PDF body text' }));
const destroy = vi.fn(async () => {});
vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(function () {
    return { getText, destroy };
  }),
}));
vi.mock('../../engine/tools/document-reading/docx-extraction.js', () => ({
  extractDocx: vi.fn(async () => ({ markdown: '# Word heading', warnings: [] })),
}));

const { extractDocumentText } = await import('../document-text.js');

describe('extractDocumentText', () => {
  it('reads plain text files and normalises line endings', async () => {
    expect(await extractDocumentText('notes.TXT', Buffer.from(' a\r\nb '))).toEqual({
      text: 'a\nb',
      truncated: false,
    });
  });

  it('reads PDFs and always releases the parser', async () => {
    expect((await extractDocumentText('bulletin.pdf', Buffer.from('%PDF'))).text).toBe(
      'PDF body text',
    );
    expect(destroy).toHaveBeenCalled();
  });

  it('reads Word documents as markdown', async () => {
    expect((await extractDocumentText('letter.docx', Buffer.from('PK'))).text).toBe(
      '# Word heading',
    );
  });

  it('caps long documents and says so', async () => {
    const long = 'x'.repeat(HELP_ASSISTANT_MAX_ATTACHMENT_CHARS + 10);
    const result = await extractDocumentText('long.md', Buffer.from(long));
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(HELP_ASSISTANT_MAX_ATTACHMENT_CHARS);
  });

  it('rejects unsupported types and files with no text', async () => {
    await expect(extractDocumentText('photo.jpg', Buffer.from('x'))).rejects.toThrow(
      /Unsupported file type/,
    );
    await expect(extractDocumentText('empty.txt', Buffer.from('   '))).rejects.toThrow(
      /No readable text/,
    );
  });
});
