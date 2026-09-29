import { WISDOM_COURSE_ID } from '@clawix/shared';

/** The staff course list: the Wisdom in Bible tab on the Church Website page. */
export const WISDOM_COURSE_HREF = '/church-website?tab=wisdom';

/** Where staff edit a course: Wisdom in Bible in its tab, Sunday School courses under Sunday School. */
export const courseAdminHref = (courseId: string): string =>
  courseId === WISDOM_COURSE_ID
    ? WISDOM_COURSE_HREF
    : `/ngo/scripture/sunday-school/courses/${courseId}`;
