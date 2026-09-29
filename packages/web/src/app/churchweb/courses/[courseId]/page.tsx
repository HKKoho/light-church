'use client';

import { useParams } from 'next/navigation';
import { CourseView } from '@/components/church-site/course-view';

/** A published Sunday School course for members. */
export default function SiteCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  return <CourseView courseId={courseId} />;
}
