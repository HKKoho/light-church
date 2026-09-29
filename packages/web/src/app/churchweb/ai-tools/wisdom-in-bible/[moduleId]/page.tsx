'use client';

import { useParams } from 'next/navigation';
import { WISDOM_COURSE_ID } from '@clawix/shared';
import { LessonView } from '@/components/church-site/lesson-view';

/** One Wisdom in Bible lesson, step by step. */
export default function WisdomLessonPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  return <LessonView courseId={WISDOM_COURSE_ID} moduleId={moduleId} />;
}
