import { describe, expect, it } from 'vitest';

import { youtubeId } from '../site-cards';

describe('youtubeId', () => {
  it('reads the id from common YouTube links', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=10',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
    }
  });

  it('returns null for other links', () => {
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
  });
});
