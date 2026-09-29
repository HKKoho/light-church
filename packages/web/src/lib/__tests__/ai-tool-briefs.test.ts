import { describe, expect, it } from 'vitest';
import { AI_TOOL_BRIEFS } from '@/components/dashboard/ai-tool-briefs';
import { BUILT_IN_AI_TOOLS } from '@/components/dashboard/built-in-ai-tools';
import { bestVoice, toSentences } from '@/hooks/use-brief-speech';

describe('toSentences', () => {
  it('splits English and Chinese sentences and drops blanks', () => {
    expect(toSentences('One. Two!  Three?')).toEqual(['One.', 'Two!', 'Three?']);
    expect(toSentences('第一句。第二句；第三句')).toEqual(['第一句。', '第二句；', '第三句']);
    expect(toSentences('   ')).toEqual([]);
  });
});

describe('bestVoice', () => {
  const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService });

  it('prefers a high-quality female voice for English', () => {
    const voices = [
      voice('Daniel', 'en-GB'),
      voice('Samantha', 'en-US'),
      voice('Ava (Premium)', 'en-US'),
      voice('Microsoft Guy Online (Natural) - English (United States)', 'en-US', false),
      voice('Sinji', 'zh-HK'),
    ];
    expect(bestVoice(voices, 'en')?.name).toBe('Ava (Premium)');
  });

  it('picks Samantha from a stock macOS voice list', () => {
    const voices = [
      'Daniel/en-GB',
      'Fred/en-US',
      'Karen/en-AU',
      'Moira/en-IE',
      'Samantha/en-US',
      'Tessa/en-ZA',
    ]
      .map((v) => v.split('/') as [string, string])
      .map(([name, lang]) => voice(name, lang));
    expect(bestVoice(voices, 'en')?.name).toBe('Samantha');
  });

  it('prefers a female Cantonese voice and ignores other languages', () => {
    const voices = [
      voice('Microsoft WanLung Online (Natural) - Chinese (Hong Kong)', 'zh-HK', false),
      voice('Sinji', 'zh-HK'),
      voice('Tingting', 'zh-CN'),
    ];
    expect(bestVoice(voices, 'zh-TW')?.name).toBe('Sinji');
    expect(bestVoice([voice('Tingting', 'zh-CN')], 'zh-TW')).toBeNull();
  });
});

describe('AI_TOOL_BRIEFS', () => {
  const keys = [
    ...BUILT_IN_AI_TOOLS.map((tool) => tool.key),
    'sunday-service-bulletin',
    'finance-pipeline',
  ];

  it.each(keys)('has an English and a Cantonese brief for %s', (key) => {
    const brief = AI_TOOL_BRIEFS[key];
    expect(brief?.en.steps.length).toBeGreaterThan(0);
    expect(brief?.['zh-TW'].steps.length).toBeGreaterThan(0);
  });
});
