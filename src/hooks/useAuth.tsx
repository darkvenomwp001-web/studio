'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType, NotificationType, Story, ReadingListItem, Achievement } from '@/types';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const USER_CACHE_KEY = 'litverse_user_cache';

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

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  notifications: NotificationType[];
  requiresPasswordSetup: boolean;
  notificationPermission: NotificationPermission;
  fcmToken: string | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const DEFAULT_REDIRECT_AUTHENTICATED = '/';
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleAchievementUnlock = useCallback((newAchievements: Achievement[], oldAchievements: Achievement[]) => {
      if (newAchievements.length > oldAchievements.length) {
          const latestAchievement = newAchievements[newAchievements.length - 1];
          const toastId = `ach-toast-${latestAchievement.id}`;
          
          if (typeof window !== 'undefined') {
              const hasSeenToast = sessionStorage.getItem(toastId);
              if (!hasSeenToast) {
                toast({
                  title: "🏆 Achievement Unlocked!",
                  description: latestAchievement.name,
                });
                sessionStorage.setItem(toastId, 'true');
              }
          }
      }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const userStatusRef = ref(rtdb, `/status/${user.id}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === false) return;

      onDisconnect(userStatusRef).set({
        state: 'offline',
        last_changed: rtdbTimestamp(),
      }).then(() => {
        set(userStatusRef, {
          state: 'online',
          last_changed: rtdbTimestamp(),
        });
      });
    });

    return () => {
      unsubscribeConnected();
      set(userStatusRef, {
        state: 'offline',
        last_changed: rtdbTimestamp(),
      });
    };
  }, [user]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    let unsubscribeNotifs: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeNotifs) unsubscribeNotifs();

      if (firebaseUser) {
        setLoading(true);
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
              notificationSettings: firestoreUserData.notificationSettings || { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
              followersCount: firestoreUserData.followersCount || 0,
              followingCount: firestoreUserData.followingIds?.length || 0,
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
              createdAt: firestoreUserData.createdAt,
              updatedAt: firestoreUserData.updatedAt,
            };

            setUser(fullUser);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(fullUser));
            }
            if(fullUser.achievements) {
                handleAchievementUnlock(fullUser.achievements, oldAchievements);
            }
            setLoading(false);
          } else {
            const isAnonymous = firebaseUser.isAnonymous;
            const username = isAnonymous
                ? `Guest${firebaseUser.uid.substring(0, 6)}`
                : firebaseUser.displayName?.replace(/\s/g, '').toLowerCase() || firebaseUser.email?.split('@')[0].toLowerCase() || `user_${firebaseUser.uid.substring(0, 5)}`;
            const displayName = isAnonymous ? 'A Mysterious Guest' : (firebaseUser.displayName || username);

            const newUserProfile: any = {
              id: firebaseUser.uid,
              username: username,
              displayName: displayName,
              email: firebaseUser.email || '',
              emailVerified: firebaseUser.emailVerified,
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`,
              bio: isAnonymous ? 'Just visiting!' : 'New to LitVerse!',
              messagingPreference: 'everyone',
              level: 1,
              xp: 0,
              achievements: [],
              notificationSettings: { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
              followersCount: 0,
              followingCount: 0,
              followingIds: [],
              closeFriendIds: [],
              fcmTokens: [],
              readingList: [],
              isAnonymous: isAnonymous,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            
            setDoc(userRef, newUserProfile, { merge: true }).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: newUserProfile,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
            setUser(newUserProfile); 
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUserProfile));
            }
            setLoading(false);
          }
        }, (error) => {
            const permissionError = new FirestorePermissionError({
                path: `users/${firebaseUser.uid}`,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        const notifsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', firebaseUser.uid),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationType)));
        }, async (error) => {
             const permissionError = new FirestorePermissionError({
                path: 'notifications',
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });

        getRedirectResult(auth).then((result) => {
            if (result) {
                toast({ title: "Authenticated with Google" });
            }
        }).catch((error) => {
            console.error("Redirect check failed:", error);
        });
        
      } else {
        setUser(null);
        setLoading(false);
        setNotifications([]);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(USER_CACHE_KEY);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, [handleAchievementUnlock, toast]);

  useEffect(() => {
    if (loading) return;
    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    if (user && !user.isAnonymous) {
        if (isAuthRoute) router.push(DEFAULT_REDIRECT_AUTHENTICATED);
    } else {
        if (!isAuthRoute && !pathname.startsWith('/stories/') && pathname !== '/search' && pathname !== '/') {
            router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
        }
    }
  }, [user, loading, pathname, router]);

  const addNotification = async (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotifData = {
        ...notificationData,
        timestamp: serverTimestamp(),
        isRead: false,
    };
    const notifColRef = collection(db, 'notifications');
    addDoc(notifColRef, newNotifData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'create',
            requestResourceData: newNotifData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const notifRef = doc(db, 'notifications', notificationId);
    updateDoc(notifRef, { isRead: true });
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    const unreadQuery = query(collection(db, 'notifications'), where('userId', '==', user.id), where('isRead', '==', false));
    const snapshot = await getDocs(unreadQuery);
    snapshot.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });
    batch.commit();
  };

  const enablePushNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted' && user) {
        const messaging = await getMessagingInstance();
        if (messaging) {
            const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (token) {
                setFcmToken(token);
                const userRef = doc(db, 'users', user.id);
                updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
            }
        }
    }
  };

  const sendVerificationEmail = async () => {
    toast({ title: "Note", description: "Email verification is currently managed internally." });
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload();
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Authenticated with Google" });
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError: any) {
          toast({ title: "Sign-In Error", description: redirectError.message || "Please allow redirects or check your internet.", variant: "destructive" });
        }
      } else {
        toast({ title: "Sign-In Error", description: error.message || "Failed to connect with Google.", variant: "destructive" });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async ({ username, email, passwordOne }: { username: string; email: string; passwordOne: string; }) => {
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, passwordOne);
      toast({ title: "Account Created!" });
    } catch (error: any) {
      toast({ title: "Sign Up Error", description: error.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmailAndPassword = async ({ emailOrUsername, passwordOne }: { emailOrUsername: string; passwordOne: string; }) => {
    setAuthLoading(true);
    try {
      let email = emailOrUsername;
      if (!emailOrUsername.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', emailOrUsername.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          email = snapshot.docs[0].data().email;
        } else {
            throw new Error("No user found with that username.");
        }
      }
      await firebaseSignInWithEmailAndPassword(auth, email, passwordOne);
    } catch (error: any) {
      toast({ title: "Sign In Error", description: error.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFirebase = async () => {
    setAuthLoading(true);
    try {
      if (user) {
        const userStatusRef = ref(rtdb, `/status/${user.id}`);
        await set(userStatusRef, {
          state: 'offline',
          last_changed: rtdbTimestamp(),
        });
      }
      await signOut(auth);
      if (typeof window !== 'undefined') {
          sessionStorage.removeItem(USER_CACHE_KEY);
      }
      router.push('/auth/signin');
    } catch (error) {
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<AppUser>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    const updateData = { ...updates, updatedAt: serverTimestamp() };
    try {
        await updateDoc(userRef, updateData);
        if (updates.username || updates.displayName || updates.avatarUrl) {
            const batch = writeBatch(db);
            const newSummary = {
                id: user.id,
                username: updates.username || user.username,
                displayName: updates.displayName || user.displayName || user.username,
                avatarUrl: updates.avatarUrl || user.avatarUrl
            };

            const storiesQuery = query(collection(db, 'stories'), where('author.id', '==', user.id));
            const storiesSnapshot = await getDocs(storiesQuery);
            storiesSnapshot.forEach(d => batch.update(d.ref, { author: newSummary }));

            const postsQuery = query(collection(db, 'feedPosts'), where('author.id', '==', user.id));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(d => batch.update(d.ref, { author: newSummary }));

            const commentsQuery = query(collection(db, 'comments'), where('user.id', '==', user.id));
            const commentsSnapshot = await getDocs(commentsQuery);
            commentsSnapshot.forEach(d => batch.update(d.ref, { user: newSummary }));

            await batch.commit();
        }
        toast({ title: "Profile Updated!" });
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const updateUserEmailFirebase = async (newEmail: string, currentPasswordForReAuth: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return false;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReAuth);
    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateFirebaseEmail(auth.currentUser, newEmail);
      await updateUserProfile({ email: newEmail });
      toast({ title: "Email Updated" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateUserPasswordFirebase = async (currentPasswordForReAuth: string, newPasswordVal: string) => {
    if (!auth.currentUser || !auth.currentUser.email) return false;
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPasswordForReAuth);
    try {
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateFirebasePassword(auth.currentUser, newPasswordVal);
      toast({ title: "Password Updated" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const sendPasswordResetFirebase = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Link Sent" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!user) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { followingIds: arrayUnion(targetUserId) });
    batch.update(doc(db, 'users', targetUserId), { followersCount: increment(1) });
    batch.commit().then(() => toast({ title: "Following!" }));
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { followingIds: arrayRemove(targetUserId) });
    batch.update(doc(db, 'users', targetUserId), { followersCount: increment(-1) });
    batch.commit().then(() => toast({ title: "Unfollowed" }));
  };

  const addToLibrary = async (story: Story) => {
    if (!user) return;
    const item: ReadingListItem = {
        id: story.id,
        title: story.title,
        author: story.author,
        chapters: story.chapters,
        lastUpdated: story.lastUpdated,
        coverImageUrl: story.coverImageUrl,
        status: story.status,
    };
    const userRef = doc(db, 'users', user.id);
    updateDoc(userRef, { readingList: arrayUnion(item) }).then(() => toast({ title: "Added to Library!" }));
  };

  const removeFromLibrary = async (storyId: string) => {
    if (!user) return;
    const itemToRemove = user.readingList?.find(i => i.id === storyId);
    if (itemToRemove) {
        const userRef = doc(db, 'users', user.id);
        updateDoc(userRef, { readingList: arrayRemove(itemToRemove) }).then(() => toast({ title: "Removed from Library" }));
    }
  };

  const setNewUserPassword = async (password: string) => {
    if (auth.currentUser) {
        try {
            await updateFirebasePassword(auth.currentUser, password);
            setRequiresPasswordSetup(false);
            toast({ title: "Password Set Successfully" });
            return true;
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            return false;
        }
    }
    return false;
  };

  const clearAppCache = async () => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(USER_CACHE_KEY);
        // Also clear other possible junk
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('ach-toast') || key.startsWith('disclaimer-seen')) {
                sessionStorage.removeItem(key);
            }
        });
        window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{
        user,
        loading,
        authLoading,
        notifications,
        requiresPasswordSetup,
        notificationPermission,
        fcmToken,
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
        clearAppCache
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
