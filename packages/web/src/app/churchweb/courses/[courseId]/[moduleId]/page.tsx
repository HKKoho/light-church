'use client';

import { useParams } from 'next/navigation';
import { LessonView } from '@/components/church-site/lesson-view';

/** One lesson of a published Sunday School course, step by step. */
export default function SiteCourseLessonPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  return <LessonView courseId={courseId} moduleId={moduleId} />;
}
