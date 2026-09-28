// packages/api/src/sunday-bulletins/__tests__/bulletin-pdf-reader.test.ts
import { describe, expect, it } from 'vitest';
import { BadGatewayException } from '@nestjs/common';

import { chineseDate, parseBulletinReply } from '../bulletin-pdf-reader.js';

describe('chineseDate', () => {
  it('writes dates the way the bulletin tool parses them', () => {
    expect(chineseDate('2026-09-27')).toBe('二零二六年九月二十七日');
    expect(chineseDate('2026-10-04')).toBe('二零二六年十月四日');
    expect(chineseDate('2026-12-13')).toBe('二零二六年十二月十三日');
    expect(chineseDate('2026-08-30')).toBe('二零二六年八月三十日');
  });
});

describe('parseBulletinReply', () => {
  const reply = `Here you go:
\`\`\`json
{
  "serviceDate": "2026-09-27",
  "serviceName": "主日崇拜",
  "time": "上午 9 時 45 分",
  "churchName": "茶果嶺浸信會",
  "sermonTitle": "末日的勸勉",
  "scripture": "希伯來書 10:19-25",
  "preacher": "陳潤生傳道",
  "items": [
    {"type": "call", "label": "宣召", "detail": "彼得前書 4:7-10,11b — 劉家安弟兄"},
    {"type": "chorus", "label": "彼此祝福", "detail": "主賜福你 — 會眾"}
  ],
  "hymns": [{"title": "耶和華以勒"}],
  "callToWorship": {"meta": "彼得前書 4:7-10,11b", "body": "啟：萬物的結局近了"},
  "ministryUpdates": [{"title": "1. 歡迎", "body": "歡迎新朋友\\n第二行"}],
  "serviceRoster": [{"section": "主日崇拜事奉芳名表", "role": "主席", "thisWeek": "劉家安弟兄", "nextWeek": "郭永健弟兄"}],
  "attendance": [{"meeting": "主日崇拜", "count": "98 人"}]
}
\`\`\``;

  it('builds a finalized bulletin with the Chinese date, fresh ids and defaults', () => {
    const b = parseBulletinReply(reply, 'pdf-abc');
    expect(b.id).toBe('pdf-abc');
    expect(b.title).toBe('主日崇拜　二零二六年九月二十七日');
    expect(b.date).toBe('二零二六年九月二十七日　上午 9 時 45 分');
    expect(b['status']).toBe('finalized');
    expect(b['items']).toEqual([
      { id: 'i1', type: 'call', label: '宣召', detail: '彼得前書 4:7-10,11b — 劉家安弟兄' },
      { id: 'i2', type: 'custom', label: '彼此祝福', detail: '主賜福你 — 會眾' },
    ]);
    expect(b['hymnLyrics']).toEqual([{ id: 'hl1', title: '耶和華以勒', meta: '', body: '' }]);
    expect(b['worshipNotes']).toEqual([
      { id: 'wn1', title: '宣召啟應文', meta: '彼得前書 4:7-10,11b', body: '啟：萬物的結局近了' },
    ]);
    expect(b['announcements']).toEqual([{ id: 'a1', text: '歡迎：歡迎新朋友' }]);
    expect(b['serviceRoster']).toEqual([
      {
        id: 'r1',
        section: '主日崇拜事奉芳名表',
        role: '主席',
        thisWeek: '劉家安弟兄',
        nextWeek: '郭永健弟兄',
      },
    ]);
    expect(b['otherNotices']).toEqual([]);
    expect(b['weeklyPrayers']).toEqual([]);
  });

  it('rejects replies without JSON or without a service date', () => {
    expect(() => parseBulletinReply('sorry', 'x')).toThrow(BadGatewayException);
    expect(() => parseBulletinReply('{"serviceName": "主日崇拜"}', 'x')).toThrow(
      BadGatewayException,
    );
  });
});
