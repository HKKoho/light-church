/**
 * convert_document_to_markdown — ad-hoc single-document reading
 * (docs/RAGplan.md, Option B).
 *
 * Converts a PDF or DOCX the user has already uploaded to their own agent's
 * workspace into a sibling Markdown file, so the agent can read it with the
 * ordinary read_file tool. No shared corpus, no admin review — this only
 * ever touches files the user put in their own workspace themselves.
 *
 * Runs host-side (in the API process), like save_memory/search_memory in
 * tools/memory.ts — not inside the sandboxed, --network none agent
 * container — because PDF/DOCX parsing and OCR have no business running
 * inside that sandbox.
 */
import * as path from 'path';

import { createLogger } from '@clawix/shared';

import { ScopedFs } from '../../workspace/scoped-fs.js';
import type { Tool, ToolResult } from '../tool.js';
import { extractDocx } from './document-reading/docx-extraction.js';
import { PdfTooLargeError, type PdfExtractionService } from './document-reading/pdf-extraction.service.js';
import { validateContainerPath } from './file-io.js';

const logger = createLogger('engine:tools:document-conversion');

const WORKSPACE_ROOT = '/workspace';
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx']);

function ok(output: string): ToolResult {
  return { output, isError: false };
}

function err(output: string): ToolResult {
  return { output, isError: true };
}

/**
 * Create the convert_document_to_markdown tool, scoped to one agent's
 * workspace on disk.
 *
 * @param workspaceLocalPath - Local (API-process-visible) path to the
 *   agent's workspace directory — `resolveWorkspacePaths(...).localPath`,
 *   the same path WorkspaceService uses for direct fs access.
 * @param pdfExtraction - Shared PdfExtractionService instance (owns the
 *   lazily-started OCR worker).
 */
export function createConvertDocumentTool(
  workspaceLocalPath: string,
  pdfExtraction: PdfExtractionService,
): Tool {
  const scopedFs = new ScopedFs(workspaceLocalPath);

  return {
    name: 'convert_document_to_markdown',
    description:
      'Convert an uploaded PDF or DOCX file in the workspace to a readable Markdown file ' +
      '(OCR is used automatically for scanned PDF pages). Returns the path to the Markdown ' +
      'file — read it with read_file to see the content. Skips reconversion if an up-to-date ' +
      '.md sibling already exists.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: `Workspace path to the PDF or DOCX file (must be within ${WORKSPACE_ROOT}).`,
        },
      },
      required: ['path'],
    },

    async execute(params: Record<string, unknown>): Promise<ToolResult> {
      const rawPath = params['path'] as string;

      let validatedPath: string;
      try {
        validatedPath = validateContainerPath(rawPath);
      } catch (e: unknown) {
        return err(e instanceof Error ? e.message : String(e));
      }
      if (!validatedPath.startsWith(`${WORKSPACE_ROOT}/`)) {
        return err(`convert_document_to_markdown only supports files under ${WORKSPACE_ROOT}.`);
      }

      const relativePath = validatedPath.slice(WORKSPACE_ROOT.length);
      const ext = path.posix.extname(relativePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return err(
          `Unsupported file type "${ext || '(none)'}". convert_document_to_markdown supports .pdf and .docx.`,
        );
      }

      const markdownRelativePath = `${relativePath}.md`;

      try {
        const sourceStat = await scopedFs.stat(relativePath).catch(() => null);
        if (!sourceStat) {
          return err(`File not found: ${validatedPath}`);
        }

        const existingStat = await scopedFs.stat(markdownRelativePath).catch(() => null);
        if (existingStat && existingStat.mtime >= sourceStat.mtime) {
          return ok(
            `Already converted (up to date): ${WORKSPACE_ROOT}${markdownRelativePath}\n` +
              `Read it with read_file.`,
          );
        }

        const buffer = (await scopedFs.readFile(relativePath)) as Buffer;

        if (ext === '.pdf') {
          const result = await pdfExtraction.extract(buffer);
          await scopedFs.writeFile(markdownRelativePath, result.markdown);
          const notes: string[] = [];
          if (result.ocrPagesUsed > 0) {
            notes.push(`${result.ocrPagesUsed} page(s) recovered via OCR`);
          }
          if (result.unextractedPages > 0) {
            notes.push(`${result.unextractedPages} page(s) could not be read — marked [UNEXTRACTED]`);
          }
          return ok(
            `Converted ${result.pageCount} page(s) to ${WORKSPACE_ROOT}${markdownRelativePath}` +
              (notes.length > 0 ? ` (${notes.join('; ')})` : '') +
              `.\nRead it with read_file.`,
          );
        }

        const result = await extractDocx(buffer);
        await scopedFs.writeFile(markdownRelativePath, result.markdown);
        const warningNote =
          result.warnings.length > 0 ? ` (${result.warnings.length} conversion warning(s))` : '';
        return ok(
          `Converted to ${WORKSPACE_ROOT}${markdownRelativePath}${warningNote}.\nRead it with read_file.`,
        );
      } catch (e: unknown) {
        if (e instanceof PdfTooLargeError) {
          return err(e.message);
        }
        logger.error({ err: e, path: validatedPath }, 'Document conversion failed');
        const message = e instanceof Error ? e.message : String(e);
        return err(`Failed to convert ${validatedPath}: ${message}`);
      }
    },
  };
}
