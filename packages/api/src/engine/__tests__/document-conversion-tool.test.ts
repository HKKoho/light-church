vi.mock('@clawix/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockExtractDocx = vi.fn();
vi.mock('../tools/document-reading/docx-extraction.js', () => ({
  extractDocx: (...args: unknown[]) => mockExtractDocx(...args),
}));

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConvertDocumentTool } from '../tools/document-conversion.js';
import { PdfTooLargeError, type PdfExtractionService } from '../tools/document-reading/pdf-extraction.service.js';

function makePdfExtraction(overrides: Partial<PdfExtractionService> = {}): PdfExtractionService {
  return {
    extract: vi.fn().mockResolvedValue({
      pageCount: 1,
      pages: [{ pageNumber: 1, text: 'hello', extracted: true, ocrUsed: false }],
      markdown: '## Page 1\n\nhello',
      ocrPagesUsed: 0,
      unextractedPages: 0,
    }),
    ...overrides,
  } as unknown as PdfExtractionService;
}

describe('createConvertDocumentTool', () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-conversion-test-'));
    mockExtractDocx.mockReset();
  });

  afterEach(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  it('rejects paths outside /workspace', async () => {
    const tool = createConvertDocumentTool(workspaceDir, makePdfExtraction());
    const result = await tool.execute({ path: '/skills/builtin/foo.pdf' });
    expect(result.isError).toBe(true);
    expect(result.output).toContain('/workspace');
  });

  it('rejects unsupported file extensions', async () => {
    await fs.writeFile(path.join(workspaceDir, 'notes.txt'), 'plain text');
    const tool = createConvertDocumentTool(workspaceDir, makePdfExtraction());
    const result = await tool.execute({ path: '/workspace/notes.txt' });
    expect(result.isError).toBe(true);
    expect(result.output).toContain('Unsupported file type');
  });

  it('returns an error when the source file does not exist', async () => {
    const tool = createConvertDocumentTool(workspaceDir, makePdfExtraction());
    const result = await tool.execute({ path: '/workspace/missing.pdf' });
    expect(result.isError).toBe(true);
    expect(result.output).toContain('File not found');
  });

  it('converts a PDF and writes a .md sibling', async () => {
    await fs.writeFile(path.join(workspaceDir, 'sermon-prep.pdf'), 'fake-pdf-bytes');
    const pdfExtraction = makePdfExtraction();
    const tool = createConvertDocumentTool(workspaceDir, pdfExtraction);

    const result = await tool.execute({ path: '/workspace/sermon-prep.pdf' });

    expect(result.isError).toBe(false);
    expect(result.output).toContain('/workspace/sermon-prep.pdf.md');
    expect(pdfExtraction.extract).toHaveBeenCalledOnce();

    const written = await fs.readFile(path.join(workspaceDir, 'sermon-prep.pdf.md'), 'utf-8');
    expect(written).toBe('## Page 1\n\nhello');
  });

  it('reports OCR and unextracted-page notes from the PDF result', async () => {
    await fs.writeFile(path.join(workspaceDir, 'scanned.pdf'), 'fake-pdf-bytes');
    const pdfExtraction = makePdfExtraction({
      extract: vi.fn().mockResolvedValue({
        pageCount: 3,
        pages: [],
        markdown: 'irrelevant',
        ocrPagesUsed: 2,
        unextractedPages: 1,
      }),
    });
    const tool = createConvertDocumentTool(workspaceDir, pdfExtraction);

    const result = await tool.execute({ path: '/workspace/scanned.pdf' });

    expect(result.output).toContain('2 page(s) recovered via OCR');
    expect(result.output).toContain('1 page(s) could not be read');
  });

  it('surfaces a PdfTooLargeError as a plain tool error', async () => {
    await fs.writeFile(path.join(workspaceDir, 'huge.pdf'), 'fake-pdf-bytes');
    const pdfExtraction = makePdfExtraction({
      extract: vi.fn().mockRejectedValue(new PdfTooLargeError(500)),
    });
    const tool = createConvertDocumentTool(workspaceDir, pdfExtraction);

    const result = await tool.execute({ path: '/workspace/huge.pdf' });

    expect(result.isError).toBe(true);
    expect(result.output).toContain('500 pages');
  });

  it('converts a DOCX via extractDocx and writes a .md sibling', async () => {
    await fs.writeFile(path.join(workspaceDir, 'letter.docx'), 'fake-docx-bytes');
    mockExtractDocx.mockResolvedValue({ markdown: '# Letter\n\nBody.', warnings: [] });
    const tool = createConvertDocumentTool(workspaceDir, makePdfExtraction());

    const result = await tool.execute({ path: '/workspace/letter.docx' });

    expect(result.isError).toBe(false);
    expect(mockExtractDocx).toHaveBeenCalledOnce();
    const written = await fs.readFile(path.join(workspaceDir, 'letter.docx.md'), 'utf-8');
    expect(written).toBe('# Letter\n\nBody.');
  });

  it('skips reconversion when an up-to-date .md sibling already exists', async () => {
    const sourcePath = path.join(workspaceDir, 'sermon-prep.pdf');
    await fs.writeFile(sourcePath, 'fake-pdf-bytes');
    // Ensure the .md sibling is written strictly after the source's mtime.
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fs.writeFile(path.join(workspaceDir, 'sermon-prep.pdf.md'), '## Page 1\n\nalready converted');

    const pdfExtraction = makePdfExtraction();
    const tool = createConvertDocumentTool(workspaceDir, pdfExtraction);

    const result = await tool.execute({ path: '/workspace/sermon-prep.pdf' });

    expect(result.isError).toBe(false);
    expect(result.output).toContain('Already converted');
    expect(pdfExtraction.extract).not.toHaveBeenCalled();
  });
});
