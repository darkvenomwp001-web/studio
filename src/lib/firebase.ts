import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, clearIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, 
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, 
};

// Singleton pattern to initialize and get Firebase app
const getFirebaseApp = () => {
  if (getApps().length === 0) {
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId
    ) {
      if (typeof window === 'undefined') {
        throw new Error('Firebase environment variables are not set. Deployment will fail.');
      }
      console.error("Firebase config is missing. The app cannot connect to Firebase.");
      return null;
    }
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

const app = getFirebaseApp();

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const rtdb = app ? getDatabase(app) : null;

if (db && typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: browser does not support it.');
    }
  });
}

export const clearFirestoreCache = async () => {
  if (db && typeof window !== 'undefined') {
    try {
      await clearIndexedDbPersistence(db);
      return true;
    } catch (e) {
      console.error("Failed to clear Firestore persistence:", e);
      return false;
    }
  }
  return false;
};

export const getMessagingInstance = async () => {
  const appInstance = getFirebaseApp();
  if (appInstance && typeof window !== 'undefined' && (await isSupported())) {
    return getMessaging(appInstance);
  }
  return null;
};

export default app;
