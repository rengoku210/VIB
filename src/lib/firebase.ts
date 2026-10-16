import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyDtXq7o-KnJDV4jZklsMQNczI0no71ZUmU',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'valorant-rent.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'valorant-rent',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'valorant-rent.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '190233531801',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:190233531801:web:b181469fe76b35849e2f08',
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || 'G-NLY46F662V',
};

// Initialize Firebase once
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Execute Google Sign-In with popup
 */
export async function signInWithGooglePopup(): Promise<{
  idToken: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  uid: string;
  user: FirebaseUser;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    idToken,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    uid: user.uid,
    user,
  };
}

/**
 * Send password reset email via Firebase Auth
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out from Firebase
 */
export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}
