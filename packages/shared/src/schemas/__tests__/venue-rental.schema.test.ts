import { describe, expect, it } from 'vitest';

import { venueApplicationSchema, venueSessionSchema } from '../venue-rental.schema.js';

const base = {
  organization: 'Hope Fellowship',
  contactPerson: '陳大文',
  contactTitle: '先生',
  mobile: '91234567',
  email: 'hope@example.com',
  venueType: '禮堂',
  sessions: [{ date: '2026-11-01', start: '09:00', end: '12:00' }],
  activityNature: '福音性聚會',
  activityMode: '公開聚會',
  targetAudience: ['成年'],
  attendanceRange: '51–100 人',
  description: 'Gospel concert',
  repName: '李小明',
  repTitle: '女士',
};

describe('venueApplicationSchema', () => {
  it('accepts a complete application', () => {
    expect(venueApplicationSchema.safeParse(base).success).toBe(true);
  });

  it('keeps a room count only for a general room, defaulting to 1', () => {
    expect(venueApplicationSchema.parse({ ...base, roomCount: 3 }).roomCount).toBeNull();
    expect(venueApplicationSchema.parse({ ...base, venueType: '一般房間' }).roomCount).toBe(1);
    expect(
      venueApplicationSchema.parse({ ...base, venueType: '一般房間', roomCount: 4 }).roomCount,
    ).toBe(4);
    expect(
      venueApplicationSchema.safeParse({ ...base, venueType: '一般房間', roomCount: 6 }).success,
    ).toBe(false);
  });

  it('requires a fee for a paid activity and drops it otherwise', () => {
    expect(venueApplicationSchema.safeParse({ ...base, activityMode: '收費活動' }).success).toBe(
      false,
    );
    expect(
      venueApplicationSchema.parse({ ...base, activityMode: '收費活動', activityFee: 100 })
        .activityFee,
    ).toBe(100);
    expect(venueApplicationSchema.parse({ ...base, activityFee: 100 }).activityFee).toBeNull();
  });

  it('rejects unknown choices, bad contact details and duplicate audiences', () => {
    for (const bad of [
      { venueType: 'Car park' },
      { contactTitle: 'Dr' },
      { email: 'not-an-email' },
      { mobile: '9123-4567' },
      { targetAudience: [] },
      { targetAudience: ['成年', '成年'] },
      { organization: '   ' },
    ]) {
      expect(venueApplicationSchema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });

  it('allows one to three sessions', () => {
    const s = base.sessions[0];
    expect(venueApplicationSchema.safeParse({ ...base, sessions: [] }).success).toBe(false);
    expect(venueApplicationSchema.safeParse({ ...base, sessions: [s, s, s] }).success).toBe(true);
    expect(venueApplicationSchema.safeParse({ ...base, sessions: [s, s, s, s] }).success).toBe(
      false,
    );
  });
});

describe('venueSessionSchema', () => {
  it('requires the end time after the start time', () => {
    expect(
      venueSessionSchema.safeParse({ date: '2026-11-01', start: '12:00', end: '09:00' }).success,
    ).toBe(false);
    expect(
      venueSessionSchema.safeParse({ date: '2026-11-01', start: '24:00', end: '25:00' }).success,
    ).toBe(false);
  });
});
