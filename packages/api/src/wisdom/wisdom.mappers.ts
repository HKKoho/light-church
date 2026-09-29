// packages/api/src/wisdom/wisdom.mappers.ts
//
// Database rows → the shapes the dashboard and church website use. Module
// content is stored as JSON (and was partly imported from the original app),
// so it is read leniently: missing or odd fields become empty values.
import {
  WISDOM_PERSPECTIVES,
  type WisdomCourseInfo,
  type WisdomCycleInfo,
  type WisdomLifeQuestion,
  type WisdomModuleDetail,
  type WisdomModuleStatus,
  type WisdomModuleSummary,
  type WisdomPerspective,
  type WisdomPerspectiveType,
} from '@clawix/shared';

import type { WisdomModuleWithCourse } from '../db/wisdom.repository.js';
import type { WisdomCourse, WisdomCycle, WisdomModule } from '../generated/prisma/client.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export function toCourseInfo(row: WisdomCourse): WisdomCourseInfo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    readingLabels: readStrings(row.readingLabels, true).slice(0, WISDOM_PERSPECTIVES.length),
    published: row.published,
    sortOrder: row.sortOrder,
  };
}

export function toCycleInfo(row: WisdomCycle): WisdomCycleInfo {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description,
    sortOrder: row.sortOrder,
  };
}

export function toModuleSummary(row: WisdomModule): WisdomModuleSummary {
  return {
    id: row.id,
    cycleId: row.cycleId,
    title: row.title,
    subtitle: row.subtitle,
    sortOrder: row.sortOrder,
    status: row.status as WisdomModuleStatus,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function readLifeQuestions(json: unknown): WisdomLifeQuestion[] {
  if (!Array.isArray(json)) return [];
  return json.map((raw, i) => {
    const q = obj(raw);
    return {
      id: str(q['id']) || `q${i}`,
      text: str(q['text']),
      type: q['type'] === 'multi_choice' ? 'multi_choice' : 'open',
      options: Array.isArray(q['options']) ? q['options'].map(str).filter(Boolean) : [],
      mediaUrl: str(q['mediaUrl']),
      imageUrl: str(q['imageUrl']),
      imageAlt: str(q['imageAlt']),
    };
  });
}

export function readPerspectives(json: unknown): Record<WisdomPerspectiveType, WisdomPerspective> {
  const all = obj(json);
  const read = (type: WisdomPerspectiveType): WisdomPerspective => {
    const p = obj(all[type]);
    return {
      book: str(p['book']),
      theme: str(p['theme']),
      description: str(p['description']),
      imageUrl: str(p['imageUrl']),
      imageAlt: str(p['imageAlt']),
      audioUrl: str(p['audioUrl']),
    };
  };
  return Object.fromEntries(WISDOM_PERSPECTIVES.map((t) => [t, read(t)])) as Record<
    WisdomPerspectiveType,
    WisdomPerspective
  >;
}

/** `keepBlank` keeps empty entries where position matters (reading labels). */
export function readStrings(json: unknown, keepBlank = false): string[] {
  if (!Array.isArray(json)) return [];
  const all = json.map(str);
  return keepBlank ? all : all.filter(Boolean);
}

export function readAnswers(json: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj(json)).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
}

export function toModuleDetail(row: WisdomModuleWithCourse): WisdomModuleDetail {
  const course = toCourseInfo(row.cycle.course);
  return {
    ...toModuleSummary(row),
    courseId: course.id,
    readingLabels: course.readingLabels,
    lifeQuestions: readLifeQuestions(row.lifeQuestions),
    perspectives: readPerspectives(row.perspectives),
    tensionGuide: row.tensionGuide,
    tensionGuideAudioUrl: row.tensionGuideAudioUrl,
    discussionPrompts: readStrings(row.discussionPrompts),
    summary: row.summary,
  };
}
