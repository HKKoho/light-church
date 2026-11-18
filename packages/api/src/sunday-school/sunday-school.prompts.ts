// packages/api/src/sunday-school/sunday-school.prompts.ts
//
// Prompts for the Sunday School Studio's AI roles, adapted from LogosCraft
// (DevBibleCourse): the Dean drafts a syllabus, the Exegete studies a
// passage, the Pedagogue lays out timed teaching blocks and the Reviewer
// checks them. Only the class profile and lesson text are sent — never
// member data. Every reply is JSON, validated before it is stored.
import type {
  GenerateSundaySchoolSyllabusData,
  SaveSundaySchoolProfileData,
  SsAgeStage,
  SsDeliveryFormat,
  SsLanguage,
  SsLiteracyLevel,
  SsMaturityLevel,
  SsMethodology,
  SsTradition,
  SsTranslation,
  SundaySchoolBlock,
  SundaySchoolExegesis,
} from '@clawix/shared';

const AGE: Record<SsAgeStage, string> = {
  preschool: 'Preschool (3-5)',
  elementary: 'Elementary (6-10)',
  preteen: 'Pre-teen (11-13)',
  youth: 'Youth (14-18)',
  young_adults: 'Young adults',
  parents: 'Parents',
  seniors: 'Seniors',
  mixed_adults: 'Mixed adults',
};
const LITERACY: Record<SsLiteracyLevel, string> = {
  visual: 'Visual / story-driven',
  basic: 'Basic reading',
  conversational: 'Conversational',
  academic: 'Academic / analytical',
};
const MATURITY: Record<SsMaturityLevel, string> = {
  seeker: 'Seeker / not yet a believer',
  new_believer: 'New believer',
  growing: 'Growing believer',
  mature: 'Mature believer',
};
const TRANSLATION: Record<SsTranslation, string> = {
  CUV: 'Chinese Union Version (和合本)',
  CUNP: 'Chinese Union Version with New Punctuation (新標點和合本)',
  NIV: 'NIV',
  ESV: 'ESV',
  NLT: 'NLT',
  KJV: 'KJV',
  CSB: 'CSB',
  NRSV: 'NRSV',
};
const TRADITION: Record<SsTradition, string> = {
  baptist: 'Baptist',
  non_denominational: 'Non-denominational evangelical',
  reformed: 'Reformed / Presbyterian',
  wesleyan: 'Wesleyan / Methodist',
  pentecostal: 'Pentecostal / Charismatic',
  anglican: 'Anglican',
  lutheran: 'Lutheran',
  catholic: 'Catholic',
};
export const METHODOLOGY: Record<SsMethodology, string> = {
  inductive: 'Inductive Bible study (observe, interpret, apply)',
  storytelling: 'Storytelling and narrative',
  socratic: 'Socratic questions and answers',
  lecture_discussion: 'Short teaching followed by discussion',
  experiential: 'Experiential activities and crafts',
};
const DELIVERY: Record<SsDeliveryFormat, string> = {
  in_person: 'Face to face in a classroom',
  online: 'Online (Zoom / Teams)',
};

const languageRule = (lang: SsLanguage) =>
  lang === 'zh-TW'
    ? 'Write every text field in Traditional Chinese as used in Hong Kong churches. Use Chinese book names for Scripture references (e.g. 約拿書 1:1-3).'
    : 'Write every text field in English.';

const JSON_ONLY = 'Reply with JSON only — no prose, no code fences.';

/** The learners, as every role sees them. */
export function describeProfile(p: SaveSundaySchoolProfileData): string {
  return `Class profile:
- Name: ${p.name}${p.description ? `\n- About: ${p.description}` : ''}
- Age and stage: ${AGE[p.ageStage]}
- Literacy: ${LITERACY[p.literacyLevel]}
- Spiritual maturity: ${MATURITY[p.spiritualMaturity]}
- Bible translation: ${TRANSLATION[p.bibleTranslation]}
- Tradition: ${TRADITION[p.tradition]}
- Doctrinal guardrails: ${p.guardrails || 'none given beyond the tradition'}
- Class size: about ${p.classSize}
- Lesson length: ${p.defaultDurationMinutes} minutes`;
}

export const DEAN_SYSTEM = `You are the Dean, an experienced Christian education director who plans Sunday School courses for a local church. Plans are faithful to Scripture, sequential and suited to the class. ${JSON_ONLY}`;

export function buildSyllabusPrompt(
  input: GenerateSundaySchoolSyllabusData,
  profile: SaveSundaySchoolProfileData,
): string {
  const how =
    input.mode === 'book'
      ? `Divide the book of ${input.subject} across all ${input.weeks} weeks in order, with accurate chapter:verse ranges and no gaps.`
      : `Choose passages from across Scripture on "${input.subject}" that build a coherent arc, each read in its context.`;
  return `Plan a ${input.weeks}-week Sunday School course.
Subject: ${input.subject} (${input.mode === 'book' ? 'book by book' : 'topical'})
${input.title ? `Working title: ${input.title}` : 'Suggest a clear course title.'}
Method: ${METHODOLOGY[input.methodology]}
Delivery: ${DELIVERY[input.deliveryFormat]}

${describeProfile(profile)}

${how}
Each week needs a title, a passage reference, a one-sentence big idea and a concrete, observable learning objective suited to the class.
${languageRule(input.language)}
Return: {"courseTitle": "", "weeks": [{"title": "", "passage": "", "bigIdea": "", "learningObjective": ""}]}`;
}

/** What one lesson is about, shared by the lesson roles. */
export interface LessonBrief {
  readonly title: string;
  readonly passage: string;
  readonly bigIdea: string;
  readonly learningObjective: string;
  readonly methodology: SsMethodology;
  readonly participationLevel: number;
  readonly deliveryFormat: SsDeliveryFormat;
  readonly targetDurationMinutes: number;
  readonly language: SsLanguage;
}

const briefText = (l: LessonBrief) => `Lesson: ${l.title}
Passage: ${l.passage}
Big idea: ${l.bigIdea}
Learning objective: ${l.learningObjective}`;

export const EXEGETE_SYSTEM = `You are the Exegete, a careful biblical scholar who helps Sunday School teachers understand a passage before they teach it. Stay within mainstream, text-anchored interpretation and respect the church's tradition and guardrails. Never quote verse text: give references with a one-line gist, so the teacher reads the words from the class's own Bible. Only give a Strong's number when you are sure of it; otherwise leave it empty. ${JSON_ONLY}`;

export function buildExegesisPrompt(lesson: LessonBrief, profile: SaveSundaySchoolProfileData) {
  return `${briefText(lesson)}

${describeProfile(profile)}

Give 2-4 sentences of historical and literary context, 3 theological anchors drawn from the text, up to 4 key verses (reference + gist), up to 4 cross-references, and 2-3 Hebrew or Greek word notes.
${languageRule(lesson.language)}
Return: {"historicalContext": "", "theologicalAnchors": [""], "keyVerses": [{"reference": "", "gist": ""}], "crossReferences": [""], "wordNotes": [{"term": "", "language": "Hebrew", "transliteration": "", "strongsId": "", "meaning": ""}]}`;
}

const participation = (level: number) =>
  level <= 2
    ? 'low: teacher-led with quiet reflection'
    : level === 3
      ? 'medium: think-pair-share, guided questions, fill-in-the-blank notes'
      : 'high: active discussion, role play, group work and games';

export const PEDAGOGUE_SYSTEM = `You are the Pedagogue, a master Christian curriculum designer. You turn a passage study into a lesson a volunteer teacher can lead, using the Hook → Book → Look → Took arc. ${JSON_ONLY}`;

export function buildBlocksPrompt(
  lesson: LessonBrief,
  profile: SaveSundaySchoolProfileData,
  exegesis: SundaySchoolExegesis,
) {
  return `${briefText(lesson)}
Method: ${METHODOLOGY[lesson.methodology]}
Participation: ${participation(lesson.participationLevel)}
Delivery: ${DELIVERY[lesson.deliveryFormat]}
Length: ${lesson.targetDurationMinutes} minutes

${describeProfile(profile)}

Exegete's notes:
- Context: ${exegesis.historicalContext}
- Anchors: ${exegesis.theologicalAnchors.join(' | ')}
- Key verses: ${exegesis.keyVerses.map((v) => v.reference).join(', ') || 'none'}

Write 5-6 blocks in order. Use the types hook, scripture, book, illustration, discussion or activity, and application (ending in prayer). Durations must add up to about ${lesson.targetDurationMinutes} minutes. Each block needs content the teacher can say or do, and teacherNotes; add a studentPrompt (with ____ for blanks) and studentAnswerKey where it helps. For scripture blocks, name the verses to read aloud — do not quote them.
${languageRule(lesson.language)}
Return: {"blocks": [{"type": "hook", "title": "", "durationMinutes": 5, "content": "", "teacherNotes": "", "studentPrompt": "", "studentAnswerKey": ""}]}`;
}

export const REVIEWER_SYSTEM = `You are the Theological and Tone Reviewer. You audit a Sunday School lesson strictly and fairly, flagging only real problems. Mark a check "needs_review" when a teacher should look at it before class. ${JSON_ONLY}`;

export function buildReviewPrompt(
  lesson: LessonBrief,
  profile: SaveSundaySchoolProfileData,
  blocks: readonly SundaySchoolBlock[],
) {
  const body = blocks
    .map(
      (b) =>
        `[${b.type} · ${b.durationMinutes} min] ${b.title}\n${b.content}\nTeacher notes: ${b.teacherNotes}`,
    )
    .join('\n\n');
  return `${briefText(lesson)}

${describeProfile(profile)}

Check the lesson below on three points:
1. verseAccuracy — are the Scripture references real, correctly cited and used in context for ${lesson.passage}?
2. ageFit — do vocabulary, illustrations and activities suit the class's age, literacy and maturity?
3. doctrine — is it faithful to the ${TRADITION[profile.tradition]} tradition and the guardrails?
Give a short detail for each, saying what to fix when it needs review, and a two-sentence summary.
${languageRule(lesson.language)}
Return: {"verseAccuracy": {"status": "verified", "detail": ""}, "ageFit": {"status": "verified", "detail": ""}, "doctrine": {"status": "verified", "detail": ""}, "summary": ""}

Lesson:
${body}`;
}
