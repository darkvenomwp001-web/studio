

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType, NotificationType, UserSummary, Story, ReadingListItem, Achievement } from '@/types';
import { auth, db } from '@/lib/firebase';
import { addNotification } from '@/app/actions/notificationActions';
import { getMessagingInstance } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  getAdditionalUserInfo,
  signInAnonymously,
  fetchSignInMethodsForEmail,
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
  arrayRemove
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const USER_CACHE_KEY = 'd4rkv3nom_user_cache';

interface AppUser extends AppUserType {
  email?: string;
  displayName?: string;
  role?: 'reader' | 'writer';
  followingIds?: string[];
  createdAt?: any; 
  updatedAt?: any; 
  isAnonymous?: boolean;
  writtenStories?: Story[];
  profileSongUrl?: string;
  profileSongNote?: string;
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
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: { username: string; email: string; passwordOne: string; }) => Promise<void>;
  signInWithEmailPassword: (data: { emailOrUsername: string; passwordOne: string; }) => Promise<void>;
  signOutFirebase: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<void>;
  updateUserEmailFirebase: (newEmail: string, currentPasswordForReAuth: string) => Promise<boolean>;
  updateUserPasswordFirebase: (currentPasswordForReAuth: string, newPasswordVal: string) => Promise<boolean>;
  sendPasswordResetFirebase: (email: string) => Promise<boolean>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  addToLibrary: (story: Story) => Promise<void>;
  removeFromLibrary: (storyId: string) => Promise<void>;
  setRequiresPasswordSetup: (requires: boolean) => void;
  setNewUserPassword: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const PUBLIC_ROUTES: string[] = ['/', '/stories', '/search', '/profile/', '/write/history', '/settings', '/library', '/admin'];
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
          // Check if we already showed this toast
          const toastId = `ach-toast-${latestAchievement.id}`;
          const hasSeenToast = sessionStorage.getItem(toastId);
          if (!hasSeenToast) {
            toast({
              title: "🏆 Achievement Unlocked!",
              description: latestAchievement.name,
            });
            sessionStorage.setItem(toastId, 'true');
          }
      }
  }, [toast]);

  useEffect(() => {
    if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
    }
    
    if ('serviceWorker' in navigator) {
        const firebaseConfigQueryString = new URLSearchParams({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
            measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
        }).toString();
        
        navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseConfigQueryString}`)
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            }).catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user && !user.isAnonymous && notificationPermission === 'granted') {
      getMessagingInstance().then(messaging => {
        if (messaging) {
          unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received.', payload);
            toast({
              title: payload.notification?.title || "New Notification",
              description: payload.notification?.body,
            });
          });
        }
      });
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, notificationPermission, toast]);


  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    
    // Attempt to load user from cache first for instant UI
    try {
        const cachedUser = sessionStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) {
            setUser(JSON.parse(cachedUser));
        }
    } catch (e) {
        console.warn("Could not read user cache from sessionStorage", e);
    }


    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (firebaseUser) {
        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, async (userSnap) => {
          const oldAchievements = user?.achievements || [];
          if (userSnap.exists()) {
            const firestoreUserData = userSnap.data() as AppUser;

            if (firestoreUserData.username === 'authorrafaelnv' && firestoreUserData.role !== 'writer') {
                await updateDoc(userRef, { role: 'writer' });
                firestoreUserData.role = 'writer';
            }
            
            // Fetch the user's written stories to populate the `writtenStories` field
            const storiesQuery = query(collection(db, "stories"), where("author.id", "==", firebaseUser.uid));
            const storiesSnapshot = await getDocs(storiesQuery);
            const writtenStories = storiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

            const fullUser: AppUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || firestoreUserData.email,
              username: firestoreUserData.username || 'User',
              displayName: firestoreUserData.displayName || firebaseUser.displayName || firestoreUserData.username,
              avatarUrl: firestoreUserData.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firestoreUserData.username || 'U').charAt(0).toUpperCase()}`,
              bio: firestoreUserData.bio || 'No bio yet.',
              role: firestoreUserData.role || 'reader',
              level: firestoreUserData.level || 1,
              xp: firestoreUserData.xp || 0,
              achievements: firestoreUserData.achievements || [],
              notificationSettings: firestoreUserData.notificationSettings || { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
              profileSongUrl: firestoreUserData.profileSongUrl || '',
              profileSongNote: firestoreUserData.profileSongNote || '',
              followersCount: firestoreUserData.followersCount || 0,
              followingCount: firestoreUserData.followingIds?.length || 0,
              followingIds: firestoreUserData.followingIds || [],
              fcmTokens: firestoreUserData.fcmTokens || [],
              writtenStories: writtenStories,
              readingList: firestoreUserData.readingList || [],
              isAnonymous: firebaseUser.isAnonymous,
              createdAt: firestoreUserData.createdAt,
              updatedAt: firestoreUserData.updatedAt,
            };

            setUser(fullUser);
            sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(fullUser));
            if(fullUser.achievements) {
                handleAchievementUnlock(fullUser.achievements, oldAchievements);
            }
          } else {
            // This logic runs once if the user document doesn't exist, e.g., on first sign-in
            const isAnonymous = firebaseUser.isAnonymous;
            const username = isAnonymous
                ? `Guest${firebaseUser.uid.substring(0, 6)}`
                : firebaseUser.displayName?.replace(/\s/g, '').toLowerCase() || firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0, 5)}`;
            const displayName = isAnonymous ? 'A Mysterious Guest' : (firebaseUser.displayName || username);
            const isOwner = username === 'authorrafaelnv';

            const newUserProfile: AppUser = {
              id: firebaseUser.uid,
              username: username,
              displayName: displayName,
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`,
              bio: isAnonymous ? 'Just visiting!' : 'New to LitVerse! Ready to explore.',
              role: isOwner ? 'writer' : 'reader', // Default role for all new users
              level: 1,
              xp: 0,
              achievements: [],
              notificationSettings: { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
              followersCount: 0,
              followingCount: 0,
              followingIds: [],
              fcmTokens: [],
              writtenStories: [],
              readingList: [],
              isAnonymous: isAnonymous,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, newUserProfile, { merge: true });
            setUser(newUserProfile); 
            sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUserProfile));
          }
          setLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            setUser(null);
            setLoading(false);
        });
        
      } else {
        // No user is signed in, so sign them in anonymously
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            // If even anonymous sign in fails, there's a deeper config issue.
            setUser(null);
            setLoading(false);
            sessionStorage.removeItem(USER_CACHE_KEY);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [handleAchievementUnlock]);


  useEffect(() => {
    if (user?.id && !user.isAnonymous) {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        orderBy('timestamp', 'desc'),
        limit(20) // Limit to recent notifications
      );
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (querySnapshot) => {
        const fetchedNotifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: (doc.data().timestamp as any)?.toDate ? (doc.data().timestamp as any).toDate().toISOString() : new Date().toISOString()
        } as NotificationType));
        setNotifications(fetchedNotifications);
      }, (error) => {
        console.error("Error fetching notifications: ", error);
        toast({ 
            title: "Could Not Load Notifications", 
            description: "There was an error fetching your notifications. This might be due to missing database indexes. Please check your browser's developer console for a link to create the required index in Firebase.",
            variant: "destructive",
            duration: 10000 
        });
      });
      return () => unsubscribeNotifications();
    } else {
      setNotifications([]); // Clear notifications if no user or user is anonymous
    }
  }, [user, toast]);


  useEffect(() => {
    if (loading || user?.isAnonymous) return; // Don't route redirect for guests
    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isPublicRouteAccessible = PUBLIC_ROUTES.some(route => {
        if (route.endsWith('/')) {
            return pathname.startsWith(route);
        }
        return route === pathname;
    });

    if (user) {
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else {
      if (!isAuthRoute && !isPublicRouteAccessible) {
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [user, loading, pathname, router]);

  const handleAuthError = (error: AuthError, operation?: string) => {
    console.error(`Firebase Auth Error during ${operation || 'operation'}:`, error.code, error.message);
    let friendlyMessage = "An unexpected error occurred. Please try again.";
    let title = "Authentication Error";

    switch (error.code) {
      case 'auth/email-already-in-use':
        friendlyMessage = "This email address is already in use by another account.";
        title = "Sign-Up Failed";
        break;
      case 'auth/invalid-email':
        friendlyMessage = "The email address format is not valid. Please check the email you entered.";
        title = "Invalid Email Format";
        break;
      case 'auth/operation-not-allowed':
        friendlyMessage = "Email/password accounts are not enabled. Please contact support.";
        break;
      case 'auth/weak-password':
        friendlyMessage = "The password is too weak. Please choose a stronger password of at least 6 characters.";
        title = "Sign-Up Failed";
        break;
      case 'auth/user-disabled':
        friendlyMessage = "This user account has been disabled.";
        break;
      case 'auth/user-not-found':
        friendlyMessage = "No account found with this email/username. Please check your credentials or sign up.";
        title = "Sign-In Failed";
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        friendlyMessage = "Invalid email/username or password. Please check your credentials.";
        title = "Sign-In Failed";
        break;
      case 'auth/popup-closed-by-user':
        title = "Google Sign-In Cancelled";
        friendlyMessage = "Google Sign-In was cancelled or the popup was closed. Please try again. Ensure pop-ups are allowed for this site and check for interfering browser extensions.";
        break;
      case 'auth/popup-blocked':
        title = "Google Sign-In Blocked";
        friendlyMessage = "Google Sign-In popup was blocked by your browser. Please allow pop-ups for this site and try again.";
        break;
      case 'auth/account-exists-with-different-credential':
        title = "Account Linking Required";
        friendlyMessage = "An account already exists with this email, but was created with a different sign-in method (e.g., Email/Password). To use Google Sign-In for this account, your Firebase project's 'User account linking' setting (Authentication -> Settings) MUST be configured to 'Link accounts that use the same email address'. Please verify this setting in your Firebase Console. Alternatively, sign in using your original method.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "A network error occurred. Please check your internet connection and try again.";
        break;
      case 'auth/unauthorized-domain':
        friendlyMessage = "This domain is not authorized for Firebase Authentication. Check your Firebase project settings.";
        break;
      case 'auth/admin-restricted-operation':
        title = "Operation Failed";
        friendlyMessage = "This operation is restricted. This can happen if you try to sign up with an email that already exists, or sign in with one that doesn't. Please double-check your email or try signing in with Google.";
        break;
      case 'auth/invalid-api-key':
        friendlyMessage = "The API Key for Firebase is invalid. Check your .env file and Firebase project settings.";
        break;
      case 'auth/requires-recent-login':
        friendlyMessage = "This action is sensitive and requires recent authentication. Please enter your current password to verify your identity and try again.";
        title = "Re-authentication Required";
        break;
      default:
        friendlyMessage = `An error occurred: ${error.message}. Please try again. (Code: ${error.code})`;
    }
    toast({ title: title, description: friendlyMessage, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        setRequiresPasswordSetup(true);
        toast({ title: "Account Created!", description: "Welcome! Please set a password for your new account to complete the setup." });
      } else {
        toast({ title: "Google Sign-In Successful", description: `Welcome back, ${result.user.displayName || result.user.email}!` });
      }
    } catch (error) {
      handleAuthError(error as AuthError, "Google Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async ({ email, passwordOne, username }: { username: string; email: string; passwordOne: string; }) => {
    setAuthLoading(true);
    try {
        // Check if username is already taken
        const usernameQuery = query(collection(db, 'users'), where('username', '==', username.trim()));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
            toast({
                title: "Username Taken",
                description: "This username is already in use. Please choose another one.",
                variant: "destructive"
            });
            setAuthLoading(false);
            return;
        }

        // Check if email is already in use
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods.length > 0) {
            toast({
                title: "Email Already in Use",
                description: "This email is already associated with an account. Please sign in instead.",
                variant: "destructive"
            });
            setAuthLoading(false);
            return;
        }
  
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: username });
        const userRef = doc(db, 'users', userCredential.user.uid);
        
        const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          username: username,
          displayName: username,
          email: email,
          avatarUrl: `https://placehold.co/100x100.png?text=${username.charAt(0).toUpperCase()}`,
          bio: 'New to LitVerse! Ready to explore.',
          role: 'reader', // Default role for all new users
          level: 1,
          xp: 0,
          achievements: [],
          notificationSettings: { emailOnNewFollower: true, emailOnCommentReply: true, emailOnNewLetter: true, emailOnNews: false },
          followersCount: 0,
          followingCount: 0,
          followingIds: [],
          fcmTokens: [],
          writtenStories: [],
          readingList: [],
          isAnonymous: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newUserProfile, { merge: true });
        toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
      }
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmailPassword = async ({ emailOrUsername, passwordOne }: { emailOrUsername: string; passwordOne: string; }) => {
    setAuthLoading(true);
    let email = emailOrUsername.trim();

    try {
      // If it's not an email, assume it's a username and fetch the email from Firestore
      if (!email.includes('@')) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          email = userData.email;
        } else {
          // To prevent user enumeration, we'll let the next step fail with a generic error
          // by passing the non-email string to it.
        }
      }

      await firebaseSignInWithEmailAndPassword(auth, email, passwordOne);
      toast({ title: "Sign In Successful", description: "You are now signed in. Redirecting..." });

    } catch (error) {
      const authError = error as AuthError;

      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
            toast({
              title: "Account Found via Google",
              description: "This email is linked to a Google account. Please use the 'Sign in with Google' button instead.",
              variant: "destructive"
            });
            setAuthLoading(false);
            return;
          }
        } catch (fetchError) {
           // This can happen if the email is invalid format, just fall through to generic handler
        }
      }
      
      handleAuthError(authError, "Email/Password Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFirebase = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      sessionStorage.removeItem(USER_CACHE_KEY);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error) {
      handleAuthError(error as AuthError, "Sign Out");
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
      
      if (updates.displayName || updates.avatarUrl) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: updates.displayName,
          photoURL: updates.avatarUrl
        });
      }
      
      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    }
    catch (error: any)
    {
      if (error.code) {
        handleAuthError(error as AuthError, "Profile Update");
      } else {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not update profile.", variant: "destructive"});
      }
    } finally {
      setAuthLoading(false);
    }
  };
  
  const reauthenticate = async (currentPasswordForReAuth: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Error", description: "User not found or email missing for re-authentication.", variant: "destructive" });
      return false;
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPasswordForReAuth);
    try {
      await reauthenticateWithCredential(firebaseUser, credential);
      return true;
    } catch (error) {
      handleAuthError(error as AuthError, "Re-authentication");
      return false;
    }
  };
  
  const updateUserEmailFirebase = async (newEmail: string, currentPasswordForReAuth: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    setAuthLoading(true);
    const reauthenticated = await reauthenticate(currentPasswordForReAuth);
    if (!reauthenticated) {
        setAuthLoading(false);
        return false;
    }
    
    try {
        await updateFirebaseEmail(firebaseUser, newEmail);
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, { email: newEmail, updatedAt: serverTimestamp() });
        toast({ title: "Email Updated", description: `Your email has been successfully updated to ${newEmail}. You might need to sign in again.` });
        return true;
    } catch (error) {
        handleAuthError(error as AuthError, "Email Update");
        return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUserPasswordFirebase = async (currentPasswordForReAuth: string, newPasswordVal: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    setAuthLoading(true);
    const reauthenticated = await reauthenticate(currentPasswordForReAuth);
     if (!reauthenticated) {
        setAuthLoading(false);
        return false;
    }
    try {
        await updateFirebasePassword(firebaseUser, newPasswordVal);
        toast({ title: "Password Updated", description: "Your password has been successfully changed." });
        return true;
    } catch (error) {
        handleAuthError(error as AuthError, "Password Update");
        return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const setNewUserPassword = async (newPasswordVal: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({ title: "Error", description: "No user is logged in to update.", variant: "destructive" });
      return false;
    }
    setAuthLoading(true);
    try {
      await updateFirebasePassword(firebaseUser, newPasswordVal);
      toast({ title: "Password Set!", description: "Your password has been successfully set. You can now sign in with your email & password." });
      setRequiresPasswordSetup(false);
      return true;
    } catch (error) {
      handleAuthError(error as AuthError, "Set New Password");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const sendPasswordResetFirebase = async (email: string): Promise<boolean> => {
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent.` });
      setAuthLoading(false);
      return true;
    } catch (error) {
      handleAuthError(error as AuthError, "Password Reset");
      setAuthLoading(false);
      return false;
    }
  };
  
  const enablePushNotifications = async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) {
        toast({ title: "Unsupported Browser", description: "Push notifications are not supported on this browser.", variant: "destructive" });
        return;
    }

    setAuthLoading(true);

    try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
            if (!vapidKey) {
                toast({
                    title: "VAPID Key Missing",
                    description: "The push notification configuration is incomplete. A VAPID key needs to be set in the environment variables.",
                    variant: "destructive",
                    duration: 9000,
                });
                setAuthLoading(false);
                return;
            }

            try {
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken && user) {
                    setFcmToken(currentToken);
                    console.log('FCM Token:', currentToken);
                    const userRef = doc(db, 'users', user.id);
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(currentToken)
                    });
                    toast({ title: "Notifications Enabled", description: "You will now receive updates outside the app." });
                } else if (!currentToken) {
                    toast({ title: "Could not get token", description: "Failed to retrieve the notification token.", variant: "destructive" });
                }
            } catch (err) {
                 console.error("Error getting FCM token:", err);
                 if (err instanceof DOMException && err.name === 'InvalidCharacterError') {
                     toast({
                         title: "Invalid VAPID Key",
                         description: "The VAPID key is not correctly encoded. Please ensure it's a valid URL-safe base64 string and check your environment variables.",
                         variant: "destructive",
                         duration: 9000
                     });
                 } else {
                     toast({ title: "Notification Setup Error", description: (err as Error).message, variant: "destructive" });
                 }
            }
        } else {
            toast({ title: "Permission Denied", description: "You won't receive push notifications.", variant: "default" });
        }
    } catch (err: any) {
        console.error('An error occurred while enabling push notifications. ', err);
        toast({ title: "Notification Error", description: err.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
        setAuthLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({ title: "Error", description: "Could not update notification status.", variant: "destructive" });
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    setAuthLoading(true);
    try {
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) {
            toast({ title: "All Read", description: "No unread notifications to mark." });
            setAuthLoading(false);
            return;
        }
        const batch = writeBatch(db);
        unreadNotifications.forEach(n => {
            const notifRef = doc(db, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
        toast({ title: "Success", description: "All notifications marked as read." });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        toast({ title: "Error", description: "Could not mark all notifications as read.", variant: "destructive" });
    } finally {
        setAuthLoading(false);
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!user || user.isAnonymous) {
      toast({ title: "Sign Up to Follow", description: "Please create an account to follow authors.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);

    const currentUserRef = doc(db, "users", user.id);
    const targetUserDoc = await getDoc(doc(db, "users", targetUserId));

    if (!targetUserDoc.exists()) {
      toast({ title: "User not found", description: "Cannot follow a user that does not exist.", variant: "destructive" });
      setAuthLoading(false);
      return;
    }

    const batch = writeBatch(db);

    // 1. Update the current user's `followingIds` list
    const newFollowingIds = Array.from(new Set([...(user.followingIds || []), targetUserId]));
    batch.update(currentUserRef, {
      followingIds: newFollowingIds,
      followingCount: newFollowingIds.length,
      updatedAt: serverTimestamp()
    });

    // 2. Create a notification for the target user
    const targetUserData = targetUserDoc.data();
    if(targetUserData){
        const actorSummary: UserSummary = {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl
        };
        await addNotification({
            userId: targetUserId,
            type: 'new_follower',
            message: `${user.displayName || user.username} started following you.`,
            link: `/profile/${user.id}`,
            actor: actorSummary
        });
    }

    try {
      await batch.commit();
      toast({title: "Followed", description: `You are now following ${targetUserData?.displayName || targetUserData?.username || 'user'}.`});
    } catch (error) {
      console.error("Error in follow batch write:", error);
      toast({title: "Error", description: "Could not follow user. Please check your permissions.", variant: "destructive"});
    } finally {
      setAuthLoading(false);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user || user.isAnonymous) return;
    setAuthLoading(true);

    const currentUserRef = doc(db, "users", user.id);
    const batch = writeBatch(db);

    // Update the current user's following list
    const newFollowingIds = (user.followingIds || []).filter(id => id !== targetUserId);
    batch.update(currentUserRef, {
        followingIds: newFollowingIds,
        followingCount: newFollowingIds.length,
        updatedAt: serverTimestamp()
    });

    try {
      await batch.commit();
      const targetUserSnap = await getDoc(doc(db, "users", targetUserId));
      if(targetUserSnap.exists()){
          const targetUserData = targetUserSnap.data();
          toast({title: "Unfollowed", description: `You have unfollowed ${targetUserData?.displayName || targetUserData?.username || 'user'}.`});
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast({title: "Error", description: "Could not unfollow user.", variant: "destructive"});
    } finally {
      setAuthLoading(false);
    }
  };

  const addToLibrary = async (story: Story) => {
    if (!user) {
      toast({ title: "Please Sign In", description: "You must be logged in to add stories to your library.", variant: "destructive" });
      return;
    }
    if (user.isAnonymous) {
      toast({ title: "Sign Up to Save", description: "Please create an account to build your library.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      
      const itemToAdd: { [key: string]: any } = {
        id: story.id,
        title: story.title,
        author: story.author,
        chapters: story.chapters || [],
        lastUpdated: story.lastUpdated,
      };

      if (story.coverImageUrl) {
        itemToAdd.coverImageUrl = story.coverImageUrl;
      }
      if (story.dataAiHint) {
        itemToAdd.dataAiHint = story.dataAiHint;
      }
      if (story.status) {
        itemToAdd.status = story.status;
      }

      await updateDoc(userRef, {
        readingList: arrayUnion(itemToAdd as ReadingListItem)
      });
      toast({ title: "Added to Library", description: `"${story.title}" has been added to your library.` });
    } catch (error) {
      console.error("Error adding to library:", error);
      toast({ title: "Error", description: "Could not add story to library.", variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const removeFromLibrary = async (storyId: string) => {
    if (!user || !user.readingList) {
        return;
    }
    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const itemToRemove = user.readingList.find(item => item.id === storyId);
      if (itemToRemove) {
        await updateDoc(userRef, {
          readingList: arrayRemove(itemToRemove)
        });
        toast({ title: "Removed from Library", description: "The story has been removed from your library." });
      }
    } catch (error) {
      console.error("Error removing from library:", error);
      toast({ title: "Error", description: "Could not remove story from library.", variant: "destructive" });
    } finally {
      setAuthLoading(false);
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
        signInWithGoogle,
        signUpWithEmailPassword,
        signInWithEmailPassword,
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
        setNewUserPassword
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
