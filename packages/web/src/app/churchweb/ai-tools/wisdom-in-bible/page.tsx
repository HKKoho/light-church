import { WISDOM_COURSE_ID } from '@clawix/shared';
import { CourseView } from '@/components/church-site/course-view';

/** Wisdom in Bible for members: the published lessons by cycle, with progress. */
export default function WisdomCoursePage() {
  return <CourseView courseId={WISDOM_COURSE_ID} />;
}
