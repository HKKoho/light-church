import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar access
provider.addScope('https://www.googleapis.com/auth/calendar');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize Firebase authentication listeners for UI callbacks.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Initiates the Google sign in popup flow and grabs the OAuth access token.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the cached in-memory access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Signs the user out.
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
}

/**
 * Posts a single devotional event to the authenticated user's primary calendar.
 */
export async function addDevotionalEventToCalendar(
  token: string,
  event: CalendarEventPayload
) {
  const startDateTime = `${event.startDate}T${event.startTime}:00`;
  
  // Devotional typically lasts 30 minutes
  const [hrs, mins] = event.startTime.split(':').map(Number);
  let endHrs = hrs;
  let endMins = mins + 30;
  if (endMins >= 60) {
    endMins -= 60;
    endHrs = (endHrs + 1) % 24;
  }
  const endHrsStr = String(endHrs).padStart(2, '0');
  const endMinsStr = String(endMins).padStart(2, '0');
  const endDateTime = `${event.startDate}T${endHrsStr}:${endMinsStr}:00`;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";

  const eventBody = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar API Error: ${response.status} - ${errText}`);
  }

  return await response.json();
}
