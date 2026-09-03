/**
 * Buffers incoming text and yields complete sentences as soon as a
 * sentence-ending boundary (., !, ?, or a newline) followed by whitespace
 * appears — so a chunk of streamed LLM text can be handed to TTS one
 * sentence at a time instead of waiting for the whole response.
 */
const BOUNDARY_RE = /(?:[.!?]+\s+)|\n+/g;

export class SentenceChunker {
  private buffer = '';

  /** Appends `text` and returns any sentences it completed. */
  push(text: string): string[] {
    this.buffer += text;
    const sentences: string[] = [];
    let cut = 0;
    BOUNDARY_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BOUNDARY_RE.exec(this.buffer)) !== null) {
      const end = match.index + match[0].length;
      const sentence = this.buffer.slice(cut, end).trim();
      if (sentence.length > 0) sentences.push(sentence);
      cut = end;
    }
    this.buffer = this.buffer.slice(cut);
    return sentences;
  }

  /** Returns and clears whatever's left in the buffer (no trailing boundary yet). */
  flush(): string | null {
    const remainder = this.buffer.trim();
    this.buffer = '';
    return remainder.length > 0 ? remainder : null;
  }
}
