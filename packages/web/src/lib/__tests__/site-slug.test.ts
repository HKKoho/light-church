import { describe, expect, it } from 'vitest';

import { slugFromParams } from '../site-slug';

describe('slugFromParams', () => {
  it('joins and decodes route segments', () => {
    expect(slugFromParams(['about', 'faith'])).toBe('about/faith');
    expect(slugFromParams(['%E8%81%AF%E7%B5%A1%E6%88%91%E5%80%91'])).toBe('聯絡我們');
    expect(slugFromParams(['聯絡我們'])).toBe('聯絡我們');
  });

  it('keeps a segment that is not valid percent-encoding', () => {
    expect(slugFromParams(['100%'])).toBe('100%');
  });
});
