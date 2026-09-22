import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, clearIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAzj27wW_-2PNyQdJI6GEIhSUTXn4JtDbU",
  authDomain: "darvenom-official.firebaseapp.com",
  databaseURL: "https://darvenom-official-default-rtdb.firebaseio.com",
  projectId: "darvenom-official",
  storageBucket: "darvenom-official.firebasestorage.app",
  messagingSenderId: "183243030955",
  appId: "1:183243030955:web:20ea7cf53bb43ee71852ee",
  measurementId: "G-FRS2XNDF56",
};

// Singleton pattern to initialize and get Firebase app
const getFirebaseApp = () => {
  if (getApps().length === 0) {
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
