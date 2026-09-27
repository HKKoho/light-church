import { redirect } from 'next/navigation';
import { WISDOM_COURSE_HREF } from './routes';

/** The course list now lives in a tab on the Church Website page. */
export default function WisdomInBiblePage() {
  redirect(WISDOM_COURSE_HREF);
}
