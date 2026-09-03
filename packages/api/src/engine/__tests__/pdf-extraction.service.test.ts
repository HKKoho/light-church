vi.mock('@clawix/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockGetInfo = vi.fn();
const mockGetText = vi.fn();
const mockGetScreenshot = vi.fn();
const mockDestroy = vi.fn();

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParse() {
    return {
      getInfo: mockGetInfo,
      getText: mockGetText,
      getScreenshot: mockGetScreenshot,
      destroy: mockDestroy,
    };
  }),
}));

const mockRecognize = vi.fn();
const mockTerminate = vi.fn();
const mockCreateWorker = vi.fn().mockResolvedValue({
  recognize: mockRecognize,
  terminate: mockTerminate,
});

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_PDF_PAGES,
  PdfExtractionService,
  PdfTooLargeError,
} from '../tools/document-reading/pdf-extraction.service.js';

describe('PdfExtractionService', () => {
  beforeEach(() => {
    mockGetInfo.mockReset();
    mockGetText.mockReset();
    mockGetScreenshot.mockReset();
    mockDestroy.mockReset();
    mockRecognize.mockReset();
    mockTerminate.mockReset();
    mockCreateWorker.mockClear();
  });

  it('extracts text-layer pages without OCR', async () => {
    mockGetInfo.mockResolvedValue({ total: 2 });
    mockGetText.mockResolvedValue({
      total: 2,
      pages: [
        { num: 1, text: 'This page has plenty of extractable text content.' },
        { num: 2, text: 'Another page with a normal amount of text on it.' },
      ],
    });

    const service = new PdfExtractionService();
    const result = await service.extract(Buffer.from('fake-pdf'));

    expect(result.pageCount).toBe(2);
    expect(result.ocrPagesUsed).toBe(0);
    expect(result.unextractedPages).toBe(0);
    expect(result.markdown).toContain('## Page 1');
    expect(result.markdown).toContain('## Page 2');
    expect(mockGetScreenshot).not.toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it('falls back to OCR for a page with no usable text layer', async () => {
    mockGetInfo.mockResolvedValue({ total: 1 });
    mockGetText.mockResolvedValue({
      total: 1,
      pages: [{ num: 1, text: '' }],
    });
    mockGetScreenshot.mockResolvedValue({
      total: 1,
      pages: [{ pageNumber: 1, dataUrl: 'data:image/png;base64,xyz', width: 100, height: 100, scale: 2 }],
    });
    mockRecognize.mockResolvedValue({ data: { text: 'Recovered via OCR' } });

    const service = new PdfExtractionService();
    const result = await service.extract(Buffer.from('fake-pdf'));

    expect(result.ocrPagesUsed).toBe(1);
    expect(result.unextractedPages).toBe(0);
    expect(result.markdown).toContain('Recovered via OCR');
    expect(result.markdown).toContain('(recovered via OCR)');
    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
  });

  it('reuses a single OCR worker across multiple pages needing OCR', async () => {
    mockGetInfo.mockResolvedValue({ total: 2 });
    mockGetText.mockResolvedValue({
      total: 2,
      pages: [
        { num: 1, text: '' },
        { num: 2, text: '' },
      ],
    });
    mockGetScreenshot.mockImplementation(({ partial }: { partial: number[] }) =>
      Promise.resolve({
        total: 1,
        pages: [{ pageNumber: partial[0], dataUrl: 'data:image/png;base64,xyz', width: 1, height: 1, scale: 2 }],
      }),
    );
    mockRecognize.mockResolvedValue({ data: { text: 'ocr text' } });

    const service = new PdfExtractionService();
    await service.extract(Buffer.from('fake-pdf'));

    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    expect(mockRecognize).toHaveBeenCalledTimes(2);
  });

  it('marks a page [UNEXTRACTED] when OCR also fails to recover text', async () => {
    mockGetInfo.mockResolvedValue({ total: 1 });
    mockGetText.mockResolvedValue({
      total: 1,
      pages: [{ num: 1, text: '' }],
    });
    mockGetScreenshot.mockRejectedValue(new Error('rasterization failed'));

    const service = new PdfExtractionService();
    const result = await service.extract(Buffer.from('fake-pdf'));

    expect(result.unextractedPages).toBe(1);
    expect(result.ocrPagesUsed).toBe(0);
    expect(result.markdown).toContain('[UNEXTRACTED');
  });

  it('rejects documents beyond the page-count ceiling before extracting text', async () => {
    mockGetInfo.mockResolvedValue({ total: MAX_PDF_PAGES + 1 });

    const service = new PdfExtractionService();
    await expect(service.extract(Buffer.from('fake-pdf'))).rejects.toThrow(PdfTooLargeError);
    expect(mockGetText).not.toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it('terminates the OCR worker on module destroy if one was started', async () => {
    mockGetInfo.mockResolvedValue({ total: 1 });
    mockGetText.mockResolvedValue({ total: 1, pages: [{ num: 1, text: '' }] });
    mockGetScreenshot.mockResolvedValue({
      total: 1,
      pages: [{ pageNumber: 1, dataUrl: 'data:image/png;base64,xyz', width: 1, height: 1, scale: 2 }],
    });
    mockRecognize.mockResolvedValue({ data: { text: 'ocr text' } });

    const service = new PdfExtractionService();
    await service.extract(Buffer.from('fake-pdf'));
    await service.onModuleDestroy();

    expect(mockTerminate).toHaveBeenCalledOnce();
  });
});
