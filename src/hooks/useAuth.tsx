'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User as AppUserType, NotificationType, Story, ReadingListItem, Achievement, UserSummary } from '@/types';
import { auth, db, rtdb } from '@/lib/firebase';
import { getMessagingInstance } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const USER_STORAGE_NAME = 'litverse_user_info';
const SAVED_ACCOUNTS_STORAGE_NAME = 'litverse_saved_identities';

interface AppUser extends AppUserType {
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  role?: 'reader' | 'writer' | 'moderator';
  followingIds?: string[];
  createdAt?: any; 
  updatedAt?: any; 
  writtenStories?: Story[];
}

interface SavedIdentity extends UserSummary {
  password?: string; 
  email?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  notifications: NotificationType[];
  unreadLettersCount: number;
  unreadConversationsCount: number;
  requiresPasswordSetup: boolean;
  notificationPermission: NotificationPermission;
  fcmToken: string | null;
  savedAccounts: SavedIdentity[];
  addNotification: (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  enablePushNotifications: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: { username: string; email: string; passwordOne: string; }) => Promise<void>;
  signInWithEmailAndPassword: (data: { emailOrUsername: string; passwordOne: string; }) => Promise<void>;
  signOutFirebase: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<void>;
  updateUserEmailFirebase: (newEmail: string, currentPasswordForReAuth: string) => Promise<boolean>;
  updateUserPasswordFirebase: (currentPasswordForReReAuth: string, newPasswordVal: string) => Promise<boolean>;
  sendPasswordResetFirebase: (email: string) => Promise<boolean>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  addToLibrary: (story: Story) => Promise<void>;
  removeFromLibrary: (storyId: string) => Promise<void>;
  setRequiresPasswordSetup: (requires: boolean) => void;
  setNewUserPassword: (password: string) => Promise<boolean>;
  clearAppCache: () => Promise<void>;
  switchAccount: (account: SavedIdentity) => Promise<void>;
  removeSavedAccount: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_PAGES = ['/auth/signin', '/auth/signup'];
const DEFAULT_HOME_PATH = '/';
const DEFAULT_LOGIN_PATH = '/auth/signin';

function AuthGuard() {
  const { user, loading, authLoading, isSwitchingIdentities } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || authLoading || isSwitchingIdentities) return;
    const isAuthRoute = AUTH_PAGES.includes(pathname);
    const isAuthenticated = user && !user.isAnonymous;
    
    const isAddingAccount = searchParams.get('mode') === 'addAccount';

    if (isAuthenticated) {
        if (isAuthRoute && !isAddingAccount) {
            router.push(DEFAULT_HOME_PATH);
        }
    } else {
        if (!isAuthRoute) {
            router.push(DEFAULT_LOGIN_PATH);
        }
    }
  }, [user, loading, authLoading, pathname, router, searchParams, isSwitchingIdentities]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(USER_STORAGE_NAME);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });

  const [savedAccounts, setSavedAccounts] = useState<SavedIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadLettersCount, setUnreadLettersCount] = useState(0);
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSwitchingIdentities, setIsSwitchingIdentities] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { showIsland } = useDynamicIsland();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_NAME);
        if (stored) setSavedAccounts(JSON.parse(stored));
    }
  }, []);

  const addSavedAccount = useCallback((account: SavedIdentity) => {
    setSavedAccounts(prev => {
        const exists = prev.some(a => a.id === account.id);
        let next;
        if (exists) {
            next = prev.map(a => a.id === account.id ? { ...a, ...account } : a);
        } else {
            next = [...prev, account];
        }
        localStorage.setItem(SAVED_ACCOUNTS_STORAGE_NAME, JSON.stringify(next));
        return next;
    });
  }, []);

  const removeSavedAccount = useCallback((userId: string) => {
    setSavedAccounts(prev => {
        const next = prev.filter(a => a.id !== userId);
        localStorage.setItem(SAVED_ACCOUNTS_STORAGE_NAME, JSON.stringify(next));
        return next;
    });
  }, []);

  const switchAccount = useCallback(async (account: SavedIdentity) => {
    if (authLoading) return;
    setAuthLoading(true);
    setIsSwitchingIdentities(true);
    try {
        if (account.email && account.password) {
            await signOut(auth);
            sessionStorage.removeItem(USER_STORAGE_NAME);
            await firebaseSignInWithEmailAndPassword(auth, account.email, account.password);
            showIsland({ title: `Persona Swapped`, description: `@${account.username} is active.`, type: 'success' });
            router.push(DEFAULT_HOME_PATH);
        } else {
            await signOut(auth);
            sessionStorage.removeItem(USER_STORAGE_NAME);
            router.push(`/auth/signin?hint=${account.username}`);
            showIsland({ title: `Identity required`, description: `Sign in as @${account.username}`, type: 'info' });
        }
    } catch (e: any) {
        toast({ title: "Failed to switch accounts", description: e.message, variant: "destructive" });
        router.push(DEFAULT_LOGIN_PATH);
    } finally {
        setAuthLoading(false);
        setIsSwitchingIdentities(false);
    }
  }, [router, showIsland, toast, authLoading]);

  const handleAchievementUnlock = useCallback((newAchievements: Achievement[], oldAchievements: Achievement[]) => {
      if (newAchievements.length > oldAchievements.length) {
          const latestAchievement = newAchievements[newAchievements.length - 1];
          const toastId = `ach-toast-${latestAchievement.id}`;
          if (typeof window !== 'undefined') {
              const hasSeenToast = sessionStorage.getItem(toastId);
              if (!hasSeenToast) {
                showIsland({
                  title: "Archive Milestone Unlocked!",
                  description: latestAchievement.name,
                  type: 'success'
                });
                sessionStorage.setItem(toastId, 'true');
              }
          }
      }
  }, [showIsland]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const userStatusRef = ref(rtdb, `/status/${user.id}`);
    const connectedRef = ref(rtdb, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === false) return;
      onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbTimestamp(), active_path: null }).then(() => {
        set(userStatusRef, { state: 'online', last_changed: rtdbTimestamp(), active_path: window.location.pathname });
      });
    });
    return () => {
      unsub();
      set(userStatusRef, { state: 'offline', last_changed: rtdbTimestamp(), active_path: null });
    };
  }, [user]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    let unsubscribeNotifs: (() => void) | undefined;
    let unsubscribeLetters: (() => void) | undefined;
    let unsubscribeConvs: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeLetters) unsubscribeLetters();
      if (unsubscribeConvs) unsubscribeConvs();

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userRef, async (userSnap) => {
          const oldAchievements = user?.achievements || [];
          if (userSnap.exists()) {
            const firestoreUserData = userSnap.data() as AppUser;
            const fullUser: AppUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || firestoreUserData.email,
              emailVerified: firebaseUser.emailVerified,
              username: firestoreUserData.username || 'User',
              displayName: firestoreUserData.displayName || firebaseUser.displayName || firestoreUserData.username,
              avatarUrl: firestoreUserData.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firestoreUserData.username || 'U').charAt(0).toUpperCase()}`,
              bio: firestoreUserData.bio || 'No bio yet.',
              role: firestoreUserData.role || 'reader',
              level: firestoreUserData.level || 1,
              xp: firestoreUserData.xp || 0,
              achievements: firestoreUserData.achievements || [],
              messagingPreference: firestoreUserData.messagingPreference || 'everyone',
              privacySettings: firestoreUserData.privacySettings || { lastSeen: 'everyone', onlineStatus: 'everyone', profilePhoto: 'everyone', stories: 'everyone', readReceipts: true },
              notificationSettings: firestoreUserData.notificationSettings || { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
              followersCount: firestoreUserData.followersCount || 0,
              followingCount: firestoreUserData.followingCount || firestoreUserData.followingIds?.length || 0,
              followingIds: firestoreUserData.followingIds || [],
              closeFriendIds: firestoreUserData.closeFriendIds || [],
              fcmTokens: firestoreUserData.fcmTokens || [],
              readingList: firestoreUserData.readingList || [],
              isAnonymous: firebaseUser.isAnonymous,
              isVerified: firestoreUserData.isVerified || false,
              isBanned: firestoreUserData.isBanned || false,
              profileSongUrl: firestoreUserData.profileSongUrl,
              profileSongNote: firestoreUserData.profileSongNote,
              appearanceSettings: firestoreUserData.appearanceSettings,
              readerSettings: firestoreUserData.readerSettings || { swipeToNavigate: true, navigationStyle: 'horizontal', autoNextChapter: false },
              createdAt: firestoreUserData.createdAt,
              updatedAt: firestoreUserData.updatedAt,
            };
            setUser(fullUser);
            if (typeof window !== 'undefined') sessionStorage.setItem(USER_STORAGE_NAME, JSON.stringify(fullUser));
            
            if (!firebaseUser.isAnonymous) {
              addSavedAccount({ 
                id: fullUser.id, 
                username: fullUser.username, 
                displayName: fullUser.displayName, 
                avatarUrl: fullUser.avatarUrl,
                email: fullUser.email
              });
            }

            if(fullUser.achievements) handleAchievementUnlock(fullUser.achievements, oldAchievements);
            setLoading(false);
          } else {
            const isAnonymous = firebaseUser.isAnonymous;
            const username = isAnonymous ? `Guest${firebaseUser.uid.substring(0, 6)}` : firebaseUser.displayName?.replace(/\s/g, '').toLowerCase() || firebaseUser.email?.split('@')[0].toLowerCase() || `user_${firebaseUser.uid.substring(0, 5)}`;
            const displayName = isAnonymous ? 'A Mysterious Guest' : (firebaseUser.displayName || username);
            const newUserProfile: any = { id: firebaseUser.uid, username, displayName, email: firebaseUser.email || '', emailVerified: firebaseUser.emailVerified, avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`, bio: isAnonymous ? 'Just visiting!' : 'New to DVHIDEOUT!', messagingPreference: 'everyone', privacySettings: { lastSeen: 'everyone', onlineStatus: 'everyone', profilePhoto: 'everyone', stories: 'everyone', readReceipts: true }, level: 1, xp: 0, achievements: [], notificationSettings: { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false }, followersCount: 0, followingCount: 0, followingIds: [], closeFriendIds: [], fcmTokens: [], readingList: [], readerSettings: { swipeToNavigate: true, navigationStyle: 'horizontal', autoNextChapter: false }, isAnonymous, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
            setDoc(userRef, newUserProfile, { merge: true }).catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'create', requestResourceData: newUserProfile }));
            });
            setUser(newUserProfile); 
            if (typeof window !== 'undefined') sessionStorage.setItem(USER_STORAGE_NAME, JSON.stringify(newUserProfile));
            setLoading(false);
          }
        }, async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
        });
        
        const notifsQuery = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid), orderBy('timestamp', 'desc'), limit(100));
        unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
            const fetchedNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationType));
            if (fetchedNotifs.length > 0) {
              const latest = fetchedNotifs[0];
              const cacheKey = `island_seen_${latest.id}`;
              if (!latest.isRead && !sessionStorage.getItem(cacheKey)) {
                showIsland({
                  title: latest.actor.displayName || latest.actor.username,
                  description: latest.message,
                  type: 'notification',
                  image: latest.actor.avatarUrl
                });
                sessionStorage.setItem(cacheKey, 'true');
              }
            }
            setNotifications(fetchedNotifs);
        }, async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'notifications', operation: 'list' }));
        });

        const lettersQuery = query(collection(db, 'letters'), where('authorId', '==', firebaseUser.uid), where('isReadByAuthor', '==', false));
        unsubscribeLetters = onSnapshot(lettersQuery, (snapshot) => {
          setUnreadLettersCount(snapshot.size);
        });

        const convsQuery = query(collection(db, 'conversations'), where('participantIds', 'array-contains', firebaseUser.uid));
        unsubscribeConvs = onSnapshot(convsQuery, (snapshot) => {
          const count = snapshot.docs.filter(d => {
            const data = d.data();
            return data.lastMessage?.senderId !== firebaseUser.uid && data.lastMessage?.isRead === false;
          }).length;
          setUnreadConversationsCount(count);
        });

        getRedirectResult(auth).then((result) => { if (result) showIsland({ title: "Archival Access Restored", type: 'success' }); }).catch(console.error);
      } else {
        setUser(null);
        setLoading(false);
        setNotifications([]);
        setUnreadLettersCount(0);
        setUnreadConversationsCount(0);
        if (typeof window !== 'undefined') sessionStorage.removeItem(USER_STORAGE_NAME);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeLetters) unsubscribeLetters();
      if (unsubscribeConvs) unsubscribeConvs();
    };
  }, [handleAchievementUnlock, toast, showIsland, addSavedAccount]);

  const addNotification = useCallback(async (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotifData = { ...notificationData, timestamp: serverTimestamp(), isRead: false };
    addDoc(collection(db, 'notifications'), newNotifData).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'notifications', operation: 'create', requestResourceData: newNotifData }));
    });
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    updateDoc(doc(db, 'notifications', notificationId), { isRead: true }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `notifications/${notificationId}`, operation: 'update', requestResourceData: { isRead: true } }));
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    const unreadQuery = query(collection(db, 'notifications'), where('userId', '==', user.id), where('isRead', '==', false));
    const snapshot = await getDocs(unreadQuery);
    snapshot.forEach(doc => batch.update(doc.ref, { isRead: true }));
    batch.commit().catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'notifications', operation: 'update' }));
    });
  }, [user]);

  const enablePushNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted' && user) {
        const messaging = await getMessagingInstance();
        if (messaging) {
            const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (token) {
                setFcmToken(token);
                updateDoc(doc(db, 'users', user.id), { fcmTokens: arrayUnion(token) });
            }
        }
    }
  }, [user]);

  const sendVerificationEmail = useCallback(async () => {
    toast({ title: "Email verification is managed internally." });
  }, [toast]);

  const reloadUser = useCallback(async () => {
    if (auth.currentUser) await auth.currentUser.reload();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      showIsland({ title: "Verified", type: 'success' });
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try { await signInWithRedirect(auth, provider); } catch (redirectError: any) {
          toast({ title: "Please allow redirects to sign in.", variant: "destructive" });
        }
      } else {
        toast({ title: "Sign-In Error", description: error.message || "Failed to connect with Google.", variant: "destructive" });
      }
    } finally { setAuthLoading(false); }
  }, [toast, showIsland]);

  const signUpWithEmailPassword = useCallback(async ({ username, email, passwordOne }: { username: string; email: string; passwordOne: string; }) => {
    setAuthLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, passwordOne);
      addSavedAccount({ 
        id: res.user.uid, 
        username, 
        email, 
        password: passwordOne 
      });
      showIsland({ title: "Identity Formed", description: `Welcome, @${username}`, type: 'success' });
    } catch (error: any) {
      toast({ title: "Sign Up Error", description: error.message, variant: "destructive" });
    } finally { setAuthLoading(false); }
  }, [toast, showIsland, addSavedAccount]);

  const signInWithEmailAndPassword = useCallback(async ({ emailOrUsername, passwordOne }: { emailOrUsername: string; passwordOne: string; }) => {
    setAuthLoading(true);
    try {
      let email = emailOrUsername;
      let username = '';
      if (!emailOrUsername.includes('@')) {
        const q = query(collection(db, 'users'), where('username', '==', emailOrUsername.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            email = snapshot.docs[0].data().email;
            username = snapshot.docs[0].data().username;
        }
        else throw new Error("No creator found with that handle.");
      }
      const res = await firebaseSignInWithEmailAndPassword(auth, email, passwordOne);
      addSavedAccount({ 
        id: res.user.uid, 
        username: username || emailOrUsername, 
        email, 
        password: passwordOne 
      });
      showIsland({ title: "Archives Restored", type: 'success' });
    } catch (error: any) {
      toast({ title: "Sign In Error", description: error.message, variant: "destructive" });
    } finally { setAuthLoading(false); }
  }, [toast, showIsland, addSavedAccount]);

  const signOutFirebase = useCallback(async () => {
    setAuthLoading(true);
    try {
      if (user) {
        const userStatusRef = ref(rtdb, `/status/${user.id}`);
        await set(userStatusRef, { state: 'offline', last_changed: rtdbTimestamp(), active_path: null });
      }
      await signOut(auth);
      if (typeof window !== 'undefined') {
          sessionStorage.removeItem(USER_STORAGE_NAME);
          localStorage.removeItem(SAVED_ACCOUNTS_STORAGE_NAME);
          setSavedAccounts([]);
      }
      router.push('/auth/signin');
      showIsland({ title: "Session terminated", type: 'info' });
    } catch (error) { console.error(error); } finally { setAuthLoading(false); }
  }, [user, router, showIsland]);

  const updateUserProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    const updateData = { ...updates, updatedAt: serverTimestamp() };
    try {
        await updateDoc(userRef, updateData);
        if (updates.username || updates.displayName || updates.avatarUrl) {
            const batch = writeBatch(db);
            const newSummary = { id: user.id, username: updates.username || user.username, displayName: updates.displayName || user.displayName || user.username, avatarUrl: updates.avatarUrl || user.avatarUrl };
            const storiesSnapshot = await getDocs(query(collection(db, 'stories'), where('author.id', '==', user.id)));
            storiesSnapshot.forEach(d => batch.update(d.ref, { author: newSummary }));
            const postsSnapshot = await getDocs(query(collection(db, 'feedPosts'), where('author.id', '==', user.id)));
            postsSnapshot.forEach(d => batch.update(d.ref, { author: newSummary }));
            const commentsSnapshot = await getDocs(query(collection(db, 'comments'), where('user.id', '==', user.id)));
            commentsSnapshot.forEach(d => batch.update(d.ref, { user: newSummary }));
            await batch.commit();
        }
        showIsland({ title: "Identity recalibrated", type: 'success' });
    } catch (serverError: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: updateData }));
    }
  }, [user, toast, showIsland]);

  const updateUserEmailFirebase = useCallback(async (newEmail: string, currentPasswordForReAuth: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return false;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReAuth);
    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateFirebaseEmail(auth.currentUser, newEmail);
      await updateUserProfile({ email: newEmail });
      showIsland({ title: "Signal email updated", type: 'success' });
      return true;
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
  }, [updateUserProfile, toast, showIsland]);

  const updateUserPasswordFirebase = useCallback(async (currentPasswordForReAuth: string, newPasswordVal: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return false;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReAuth);
    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateFirebasePassword(auth.currentUser, newPasswordVal);
      showIsland({ title: "Access code updated", type: 'success' });
      return true;
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
  }, [toast, showIsland]);

  const sendPasswordResetFirebase = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showIsland({ title: "Reset signal emitted", type: 'info' });
      return true;
    } catch (error: any) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return false;
    }
  }, [toast, showIsland]);

  const followUser = useCallback(async (targetUserId: string) => {
    if (!user || user.id === targetUserId) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.id);
    const targetRef = doc(db, 'users', targetUserId);
    
    batch.update(userRef, { 
      followingIds: arrayUnion(targetUserId),
      followingCount: increment(1)
    });
    batch.update(targetRef, { 
      followersCount: increment(1) 
    });

    batch.commit()
      .then(async () => {
          await addNotification({
              userId: targetUserId,
              type: 'new_follower',
              message: `began tracking your archive.`,
              link: `/profile/${user.id}`,
              actor: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl }
          });
          showIsland({ title: "Archive connected", type: 'success' });
      })
      .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${targetUserId}`, operation: 'update' }));
      });
  }, [user, showIsland, addNotification]);

  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!user || user.id === targetUserId) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.id);
    const targetRef = doc(db, 'users', targetUserId);

    batch.update(userRef, { 
      followingIds: arrayRemove(targetUserId),
      followingCount: increment(-1)
    });
    batch.update(targetRef, { 
      followersCount: increment(-1) 
    });

    batch.commit()
      .then(() => showIsland({ title: "Signal severed", type: 'info' }))
      .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${targetUserId}`, operation: 'update' }));
      });
  }, [user, showIsland]);

  const addToLibrary = useCallback(async (story: Story) => {
    if (!user) return;
    const item: ReadingListItem = { id: story.id, title: story.title, author: story.author, chapters: story.chapters, lastUpdated: story.lastUpdated, coverImageUrl: story.coverImageUrl, status: story.status };
    updateDoc(doc(db, 'users', user.id), { readingList: arrayUnion(item) })
        .then(() => showIsland({ title: "Manuscript Archived", type: 'success' }))
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}`, operation: 'update', requestResourceData: { readingList: 'arrayUnion' } }));
        });
  }, [user, showIsland]);

  const removeFromLibrary = useCallback(async (storyId: string) => {
    if (!user) return;
    const itemToRemove = user.readingList?.find(i => i.id === storyId);
    if (itemToRemove) {
        updateDoc(doc(db, 'users', user.id), { readingList: arrayRemove(itemToRemove) })
            .then(() => showIsland({ title: "Archive entry removed", type: 'info' }))
            .catch(async (error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.id}`, operation: 'update', requestResourceData: { readingList: 'arrayRemove' } }));
            });
    }
  }, [user, showIsland]);

  const setNewUserPassword = useCallback(async (password: string) => {
    if (auth.currentUser) {
        try {
            await updateFirebasePassword(auth.currentUser, password);
            setRequiresPasswordSetup(false);
            showIsland({ title: "Credentials finalized", type: 'success' });
            return true;
        } catch (error: any) {
            toast({ title: "Action failed", description: error.message, variant: "destructive" });
            return false;
        }
    }
    return false;
  }, [toast, showIsland]);

  const clearAppCache = useCallback(async () => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(USER_STORAGE_NAME);
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('ach-toast') || key.startsWith('disclaimer-seen') || key.startsWith('island_seen')) sessionStorage.removeItem(key);
        });
        window.location.reload();
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    authLoading,
    notifications,
    unreadLettersCount,
    unreadConversationsCount,
    requiresPasswordSetup,
    notificationPermission,
    fcmToken,
    savedAccounts,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    enablePushNotifications,
    sendVerificationEmail,
    reloadUser,
    signInWithGoogle,
    signUpWithEmailPassword,
    signInWithEmailAndPassword,
    signOutFirebase,
    updateUserProfile,
    updateUserEmailFirebase,
    updateUserPasswordFirebase,
    sendPasswordResetFirebase,
    followUser,
    unfollowUser,
    addToLibrary,
    removeFromLibrary,
    setRequiresPasswordSetup,
    setNewUserPassword,
    clearAppCache,
    switchAccount,
    removeSavedAccount
  }), [
    user, loading, authLoading, notifications, unreadLettersCount, unreadConversationsCount, requiresPasswordSetup, 
    notificationPermission, fcmToken, savedAccounts, addNotification, markNotificationAsRead, 
    markAllNotificationsAsRead, enablePushNotifications, sendVerificationEmail, 
    reloadUser, signInWithGoogle, signUpWithEmailPassword, 
    signInWithEmailAndPassword, signOutFirebase, updateUserProfile, 
    updateUserEmailFirebase, updateUserPasswordFirebase, sendPasswordResetFirebase, 
    followUser, unfollowUser, addToLibrary, removeFromLibrary, 
    setRequiresPasswordSetup, setNewUserPassword, clearAppCache, switchAccount, removeSavedAccount
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <AuthGuard />
      </Suspense>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
