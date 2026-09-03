---
name: read-document
description: "Use when the user uploads or references a PDF or DOCX file in their workspace and asks you to read, summarize, explain, or answer questions about it. Call convert_document_to_markdown, then read_file on the resulting path, then respond. Skip conversion if a current .md sibling is already present. Triggers: 'read this PDF', 'summarize this document', 'what does this say about', an uploaded .pdf or .docx filename."
license: MIT
pack: church
---

# Reading an uploaded document

This is ad-hoc, single-document reading — not the approved theological
library. There is no admin review and no shared corpus here: it's the
user's own document, and you're reading it the same way they'd read it
themselves, just faster.

## Steps

1. **Convert**: call `convert_document_to_markdown({ path })` with the
   workspace path to the PDF or DOCX. It skips the work and returns
   immediately if an up-to-date `.md` sibling already exists.
2. **Read**: call `read_file({ path: <markdownPath from step 1> })` to load
   the content.
3. **Discuss** the content normally, in your own voice, per the pastor's
   question.

## Rules

- Always cite page numbers when discussing specific claims from a PDF
  (the converted Markdown is organized under `## Page N` headings) —
  it lets the pastor go verify the source themselves.
- If the tool result reports pages recovered via OCR or marked
  `[UNEXTRACTED]`, tell the user which pages couldn't be read cleanly
  rather than silently treating the document as complete.
- Don't present this document with the institutional authority of the
  approved theological library — it carries whatever authority the user
  already grants it themselves, nothing more.
- No need to reconvert on every follow-up question in the same
  conversation — once read, the content is already part of this session;
  just keep answering from it.
