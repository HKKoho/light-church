import { describe, it, expect } from 'vitest';
import { SentenceChunker } from '../sentence-chunker.js';

describe('SentenceChunker', () => {
  it('yields a completed sentence once its boundary is pushed', () => {
    const chunker = new SentenceChunker();
    expect(chunker.push('Hello there. How are')).toEqual(['Hello there.']);
    expect(chunker.push(' you? I am fine.')).toEqual(['How are you?']);
    expect(chunker.flush()).toBe('I am fine.');
  });

  it('holds back an incomplete trailing fragment until the next push', () => {
    const chunker = new SentenceChunker();
    expect(chunker.push('This sentence keeps')).toEqual([]);
    expect(chunker.push(' going and finally ends. Next one starts')).toEqual([
      'This sentence keeps going and finally ends.',
    ]);
  });

  it('treats newlines as boundaries', () => {
    const chunker = new SentenceChunker();
    expect(chunker.push('First line\nSecond line\n')).toEqual(['First line', 'Second line']);
  });

  it('does not emit terminal punctuation until it is followed by whitespace', () => {
    const chunker = new SentenceChunker();
    expect(chunker.push('Almost done.')).toEqual([]);
    expect(chunker.push(' Continuing on.')).toEqual(['Almost done.']);
  });

  it('flush returns and clears the remaining buffered fragment', () => {
    const chunker = new SentenceChunker();
    chunker.push('No trailing punctuation yet');
    expect(chunker.flush()).toBe('No trailing punctuation yet');
    expect(chunker.flush()).toBeNull();
  });

  it('flush returns null when nothing is buffered', () => {
    const chunker = new SentenceChunker();
    expect(chunker.flush()).toBeNull();
  });

  it('ignores whitespace-only pushes', () => {
    const chunker = new SentenceChunker();
    expect(chunker.push('   ')).toEqual([]);
    expect(chunker.flush()).toBeNull();
  });
});
