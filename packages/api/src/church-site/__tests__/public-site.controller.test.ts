import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { parseSlug } from '../public-site.controller.js';

describe('parseSlug', () => {
  it('accepts nested and Chinese slugs', () => {
    expect(parseSlug('about/faith')).toBe('about/faith');
    expect(parseSlug('聯絡我們')).toBe('聯絡我們');
  });

  it('rejects missing and unsafe slugs', () => {
    for (const bad of [undefined, '', '../etc', 'a//b', '/a', 'a b']) {
      expect(() => parseSlug(bad)).toThrow(BadRequestException);
    }
  });
});
