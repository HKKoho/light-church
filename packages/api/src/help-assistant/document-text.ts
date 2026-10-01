// packages/api/src/help-assistant/document-text.ts
//
// Turns a document the user attaches in the Help Assistant into plain text the
// model can summarize or edit. Nothing is saved — the text goes back to the
// browser, which sends it with the next chat turn.
import path from 'node:path';

import { UnprocessableEntityException } from '@nestjs/common';
import { HELP_ASSISTANT_MAX_ATTACHMENT_CHARS } from '@clawix/shared';
import { PDFParse } from 'pdf-parse';

import { extractDocx } from '../engine/tools/document-reading/docx-extraction.js';

const MAX_PDF_PAGES = 60;

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.json',
  '.html',
  '.htm',
]);

export const SUPPORTED_DOCUMENT_EXTENSIONS: readonly string[] = [
  '.pdf',
  '.docx',
  ...TEXT_EXTENSIONS,
];

export interface DocumentText {
  readonly text: string;
  readonly truncated: boolean;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText({ first: MAX_PDF_PAGES });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocumentText(filename: string, buffer: Buffer): Promise<DocumentText> {
  const ext = path.extname(filename).toLowerCase();
  let raw: string;
  if (ext === '.pdf') {
    raw = await extractPdf(buffer);
  } else if (ext === '.docx') {
    raw = (await extractDocx(buffer)).markdown;
  } else if (TEXT_EXTENSIONS.has(ext)) {
    raw = buffer.toString('utf8');
  } else {
    throw new UnprocessableEntityException(
      `Unsupported file type. Attach one of: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}`,
    );
  }

  const text = raw.replace(/\r\n/g, '\n').trim();
  if (text.length === 0) {
    throw new UnprocessableEntityException(
      'No readable text found in this file (is it a scanned image?)',
    );
  }
  return {
    text: text.slice(0, HELP_ASSISTANT_MAX_ATTACHMENT_CHARS),
    truncated: text.length > HELP_ASSISTANT_MAX_ATTACHMENT_CHARS,
  };
}
