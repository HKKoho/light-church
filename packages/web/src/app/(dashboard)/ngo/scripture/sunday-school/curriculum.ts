// 2027 Sunday School plan (聖工手冊 2027 培育部計劃). Teacher names stay in Chinese in both locales.

import type { Lang } from '@/lib/i18n';

type Text = Record<Lang, string>;

export interface Lesson {
  readonly topic?: Text;
  readonly teachers: string;
}

export interface ClassRow {
  readonly name: Text;
  /** One entry per quarter (Q1–Q4); null when the class is not held that quarter. */
  readonly quarters: readonly [Lesson | null, Lesson | null, Lesson | null, Lesson | null];
}

export const LEADERS = { head: '陳潤生傳道', deputy: '熊天佑弟兄' } as const;

export const CLASSES_2027: readonly ClassRow[] = [
  {
    name: { en: 'Seniors', 'zh-TW': '長者班' },
    quarters: [
      {
        topic: { en: 'Ecclesiastes (spiritual reading)', 'zh-TW': '傳道書（靈閱）' },
        teachers: '熊天佑',
      },
      { topic: { en: 'Acts (first reading)', 'zh-TW': '使徒行傳（初讀）' }, teachers: '劉家安' },
      {
        topic: { en: '1–3 John (spiritual reading)', 'zh-TW': '約翰一二三書（靈閱）' },
        teachers: '張澍佳牧師',
      },
      { topic: { en: 'Mark (application)', 'zh-TW': '馬可福音（應用）' }, teachers: '錢志和' },
    ],
  },
  {
    name: { en: 'First Reading', 'zh-TW': '初讀班' },
    quarters: [
      { topic: { en: 'Joshua (part 1)', 'zh-TW': '約書亞記（上）' }, teachers: '葉國良' },
      { topic: { en: 'Galatians', 'zh-TW': '加拉太書' }, teachers: '鄧惠權' },
      { topic: { en: 'Joshua (part 2)', 'zh-TW': '約書亞記（下）' }, teachers: '葉國良' },
      { topic: { en: 'Philippians', 'zh-TW': '腓立比書' }, teachers: '劉家安' },
    ],
  },
  {
    name: { en: 'Application', 'zh-TW': '應用班' },
    quarters: [
      { topic: { en: 'Galatians', 'zh-TW': '加拉太書' }, teachers: '蔡錦源' },
      { topic: { en: 'Mark', 'zh-TW': '馬可福音' }, teachers: '錢志和' },
      { topic: { en: 'Minor Prophets (part 1)', 'zh-TW': '小先知書（上）' }, teachers: '熊天佑' },
      { topic: { en: 'Minor Prophets (part 2)', 'zh-TW': '小先知書（下）' }, teachers: '熊天佑' },
    ],
  },
  {
    name: { en: 'Spiritual Reading', 'zh-TW': '靈閱班' },
    quarters: [null, { teachers: '蔡月保' }, { teachers: '蔡月保' }, null],
  },
  {
    name: { en: 'Introduction', 'zh-TW': '導論班' },
    quarters: [
      { topic: { en: 'New Testament Introduction', 'zh-TW': '新約導論' }, teachers: '陳潤生傳道' },
      { topic: { en: 'New Testament Introduction', 'zh-TW': '新約導論' }, teachers: '陳潤生傳道' },
      { topic: { en: 'Old Testament Introduction', 'zh-TW': '舊約導論' }, teachers: '陳潤生傳道' },
      { topic: { en: 'Old Testament Introduction', 'zh-TW': '舊約導論' }, teachers: '陳潤生傳道' },
    ],
  },
  {
    name: { en: 'Gospel', 'zh-TW': '福音班' },
    quarters: [
      { topic: { en: 'Gospel in 8 lessons', 'zh-TW': '福音 8 課' }, teachers: '鍾鳳玉、白燕芬' },
      null,
      null,
      null,
    ],
  },
  {
    name: { en: 'Faith', 'zh-TW': '信仰班' },
    quarters: [
      {
        topic: {
          en: 'Based on Growth in 8 Lessons or the membership class',
          'zh-TW': '參考成長 8 課或會友班課程',
        },
        teachers: '譚鈞平、郭永健、教牧同工、專門導師',
      },
      null,
      null,
      null,
    ],
  },
];
