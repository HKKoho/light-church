const mockConvertToHtml = vi.fn();

vi.mock('mammoth', () => ({
  default: { convertToHtml: (...args: unknown[]) => mockConvertToHtml(...args) },
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extractDocx } from '../tools/document-reading/docx-extraction.js';

describe('extractDocx', () => {
  beforeEach(() => {
    mockConvertToHtml.mockReset();
  });

  it('converts mammoth HTML output to markdown', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Sermon Notes</h1><p>Grace is <strong>unmerited</strong> favor.</p>',
      messages: [],
    });

    const result = await extractDocx(Buffer.from('fake-docx'));

    expect(result.markdown).toContain('# Sermon Notes');
    expect(result.markdown).toContain('**unmerited**');
    expect(result.warnings).toEqual([]);
    expect(mockConvertToHtml).toHaveBeenCalledWith({ buffer: expect.any(Buffer) });
  });

  it('surfaces mammoth conversion warnings', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Body text</p>',
      messages: [{ type: 'warning', message: "Unrecognized style 'Custom1'" }],
    });

    const result = await extractDocx(Buffer.from('fake-docx'));

    expect(result.warnings).toEqual(["Unrecognized style 'Custom1'"]);
  });
});
