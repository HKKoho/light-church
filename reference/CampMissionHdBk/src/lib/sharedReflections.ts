import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { app, auth } from './googleCalendar';

const db = getFirestore(app);
const REFLECTIONS_COLLECTION = 'sharedReflections';

export interface SharedReflection {
  id: string;
  dayNumber: number;
  question: string;
  text: string;
  createdAt: Date | null;
}

/**
 * Ensures the client has some Firebase Auth session (anonymous is fine) so
 * Firestore security rules can gate writes without ever collecting a name.
 */
const ensureAuthed = async (): Promise<void> => {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
};

/**
 * Anonymously shares a single reflection answer with the group.
 * Intentionally omits any user/uid/name field from the stored document.
 */
export const shareReflection = async (
  dayNumber: number,
  question: string,
  text: string
): Promise<void> => {
  await ensureAuthed();
  await addDoc(collection(db, REFLECTIONS_COLLECTION), {
    dayNumber,
    question,
    text,
    createdAt: serverTimestamp()
  });
};

/**
 * Subscribes to the live group reflections wall, newest first.
 * Returns an unsubscribe function.
 */
export const subscribeToSharedReflections = (
  onUpdate: (reflections: SharedReflection[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  const q = query(
    collection(db, REFLECTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SharedReflection[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
        return {
          id: doc.id,
          dayNumber: data.dayNumber,
          question: data.question,
          text: data.text,
          createdAt
        };
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Unable to subscribe to shared reflections', error);
      if (onError) onError(error);
    }
  );
};
