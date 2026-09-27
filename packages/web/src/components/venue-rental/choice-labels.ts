import type {
  VENUE_ACTIVITY_MODES,
  VENUE_ACTIVITY_NATURES,
  VENUE_ATTENDANCE_RANGES,
  VENUE_AUDIENCES,
  VENUE_TITLES,
  VENUE_TYPES,
} from '@clawix/shared';
import type { Lang } from '@/lib/i18n';

// The form's choices are stored in Chinese (as on the church's paper form);
// these are their English labels. In zh-TW the stored value is the label.
type Choice =
  | (typeof VENUE_TYPES)[number]
  | (typeof VENUE_ACTIVITY_NATURES)[number]
  | (typeof VENUE_ACTIVITY_MODES)[number]
  | (typeof VENUE_AUDIENCES)[number]
  | (typeof VENUE_ATTENDANCE_RANGES)[number]
  | (typeof VENUE_TITLES)[number];

const EN: Record<Choice, string> = {
  全場: 'Whole premises',
  禮堂: 'Hall',
  草地: 'Lawn',
  一般房間: 'Room(s)',
  福音性聚會: 'Evangelistic gathering',
  '課程、研討會、教育性聚會': 'Course, seminar or education',
  文娛康樂: 'Recreation and culture',
  公開聚會: 'Open to the public',
  會內聚會: 'Members only',
  收費活動: 'Paid event',
  兒童: 'Children',
  親子: 'Families',
  青少年: 'Youth',
  成年: 'Adults',
  長者: 'Seniors',
  其他: 'Other',
  '20 人或以下': '20 or fewer',
  '21–50 人': '21–50',
  '51–100 人': '51–100',
  '101–200 人': '101–200',
  '200 人以上': 'Over 200',
  先生: 'Mr',
  女士: 'Ms',
};

/** A stored choice value shown in the current language. */
export function choiceLabel(value: string, lang: Lang): string {
  return lang === 'en' ? (EN[value as Choice] ?? value) : value;
}
