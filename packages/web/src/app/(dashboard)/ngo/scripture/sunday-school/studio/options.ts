import type {
  SsAgeStage,
  SsDeliveryFormat,
  SsLiteracyLevel,
  SsMaturityLevel,
  SsMethodology,
  SsTradition,
  SsTranslation,
} from '@clawix/shared';
import { useT, type Messages } from '@/lib/i18n';

const en = {
  ageStage: {
    preschool: 'Preschool (3–5)',
    elementary: 'Primary (6–10)',
    preteen: 'Pre-teen (11–13)',
    youth: 'Youth (14–18)',
    young_adults: 'Young adults',
    parents: 'Parents',
    seniors: 'Seniors',
    mixed_adults: 'Adults (mixed)',
  } satisfies Record<SsAgeStage, string>,
  literacy: {
    visual: 'Pictures and stories',
    basic: 'Basic reading',
    conversational: 'Conversational',
    academic: 'Academic',
  } satisfies Record<SsLiteracyLevel, string>,
  maturity: {
    seeker: 'Seekers',
    new_believer: 'New believers',
    growing: 'Growing believers',
    mature: 'Mature believers',
  } satisfies Record<SsMaturityLevel, string>,
  translation: {
    CUV: '和合本 (CUV)',
    CUNP: '新標點和合本 (CUNP)',
    NIV: 'NIV',
    ESV: 'ESV',
    NLT: 'NLT',
    KJV: 'KJV',
    CSB: 'CSB',
    NRSV: 'NRSV',
  } satisfies Record<SsTranslation, string>,
  tradition: {
    baptist: 'Baptist',
    non_denominational: 'Non-denominational',
    reformed: 'Reformed / Presbyterian',
    wesleyan: 'Wesleyan / Methodist',
    pentecostal: 'Pentecostal / Charismatic',
    anglican: 'Anglican',
    lutheran: 'Lutheran',
    catholic: 'Catholic',
  } satisfies Record<SsTradition, string>,
  methodology: {
    inductive: 'Inductive study (observe, interpret, apply)',
    storytelling: 'Storytelling',
    socratic: 'Questions and answers',
    lecture_discussion: 'Teaching and discussion',
    experiential: 'Activities and crafts',
  } satisfies Record<SsMethodology, string>,
  delivery: {
    in_person: 'Face to face',
    online: 'Online (Zoom / Teams)',
  } satisfies Record<SsDeliveryFormat, string>,
};

const messages = {
  en,
  'zh-TW': {
    ageStage: {
      preschool: '幼兒（3–5 歲）',
      elementary: '小學（6–10 歲）',
      preteen: '少年（11–13 歲）',
      youth: '青少年（14–18 歲）',
      young_adults: '青年',
      parents: '家長',
      seniors: '長者',
      mixed_adults: '成人（混合）',
    },
    literacy: {
      visual: '圖畫及故事',
      basic: '基本閱讀',
      conversational: '一般對話',
      academic: '學術程度',
    },
    maturity: {
      seeker: '慕道者',
      new_believer: '初信者',
      growing: '成長中的信徒',
      mature: '成熟信徒',
    },
    translation: en.translation,
    tradition: {
      baptist: '浸信會',
      non_denominational: '不分宗派',
      reformed: '改革宗／長老會',
      wesleyan: '循道衛理',
      pentecostal: '五旬節／靈恩',
      anglican: '聖公會',
      lutheran: '信義宗',
      catholic: '天主教',
    },
    methodology: {
      inductive: '歸納式查經（觀察、解釋、應用）',
      storytelling: '說故事',
      socratic: '問答',
      lecture_discussion: '講授及討論',
      experiential: '活動及手工',
    },
    delivery: { in_person: '實體', online: '網上（Zoom / Teams）' },
  },
} satisfies Messages<typeof en>;

export type OptionLabels = typeof en;
export const useOptionLabels = () => useT(messages);
