
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType, NotificationType, UserSummary, Story, ReadingListItem, Achievement } from '@/types';
import { auth, db } from '@/lib/firebase';
import { addNotification as addNotificationAction } from '@/app/actions/notificationActions';
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
  sendEmailVerification,
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const USER_CACHE_KEY = 'd4rkv3nom_user_cache';
const OWNER_USERNAMES = ['authorrafaelnv', 'd4rkv3nom'];

interface AppUser extends AppUserType {
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  role?: 'reader' | 'writer' | 'moderator' | 'admin';
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
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
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

const AUTH_ROUTES = ['/auth/signin', '/auth/signup', '/auth/verify-email'];
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

            const updates: { role?: 'admin'; isVerified?: boolean } = {};
            const isOwner = OWNER_USERNAMES.includes(firestoreUserData.username);
            
            if (isOwner) {
                if (firestoreUserData.role !== 'admin') {
                    updates.role = 'admin';
                }
                if (!firestoreUserData.isVerified) {
                    updates.isVerified = true;
                }
            }

            if (Object.keys(updates).length > 0) {
                updateDoc(userRef, updates).catch(async (serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: userRef.path,
                        operation: 'update',
                        requestResourceData: updates,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
                Object.assign(firestoreUserData, updates);
            }
            
            const storiesQuery = query(collection(db, "stories"), where("author.id", "==", firebaseUser.uid));
            const storiesSnapshot = await getDocs(storiesQuery);
            const writtenStories = storiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

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
              profileSongUrl: firestoreUserData.profileSongUrl || '',
              profileSongNote: firestoreUserData.profileSongNote || '',
              followersCount: firestoreUserData.followersCount || 0,
              followingCount: firestoreUserData.followingIds?.length || 0,
              followingIds: firestoreUserData.followingIds || [],
              fcmTokens: firestoreUserData.fcmTokens || [],
              writtenStories: writtenStories,
              readingList: firestoreUserData.readingList || [],
              isAnonymous: firebaseUser.isAnonymous,
              isVerified: firestoreUserData.isVerified,
              isBanned: firestoreUserData.isBanned,
              createdAt: firestoreUserData.createdAt,
              updatedAt: firestoreUserData.updatedAt,
            };

            setUser(fullUser);
            sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(fullUser));
            if(fullUser.achievements) {
                handleAchievementUnlock(fullUser.achievements, oldAchievements);
            }
          } else {
            const isAnonymous = firebaseUser.isAnonymous;
            const username = isAnonymous
                ? `Guest${firebaseUser.uid.substring(0, 6)}`
                : firebaseUser.displayName?.replace(/\s/g, '').toLowerCase() || firebaseUser.email?.split('@')[0].toLowerCase() || `user_${firebaseUser.uid.substring(0, 5)}`;
            const displayName = isAnonymous ? 'A Mysterious Guest' : (firebaseUser.displayName || username);
            const isOwner = OWNER_USERNAMES.includes(username);

            const newUserProfile: AppUser = {
              id: firebaseUser.uid,
              username: username,
              displayName: displayName,
              email: firebaseUser.email || '',
              emailVerified: firebaseUser.emailVerified,
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`,
              bio: isAnonymous ? 'Just visiting!' : 'New to LitVerse! Ready to explore.',
              role: isOwner ? 'admin' : 'reader',
              isVerified: isOwner,
              messagingPreference: 'everyone',
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
            
            setDoc(userRef, newUserProfile, { merge: true }).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'write',
                    requestResourceData: newUserProfile,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
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
        setUser(null);
        setLoading(false);
        sessionStorage.removeItem(USER_CACHE_KEY);
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
    if (loading) return;

    if (user && !user.isAnonymous) {
        const isEmailPasswordProvider = auth.currentUser?.providerData.some(
            (provider) => provider.providerId === 'password'
        );

        if (isEmailPasswordProvider && !user.emailVerified) {
            if (pathname !== '/auth/verify-email') {
                router.push('/auth/verify-email');
            }
        } else {
             if (AUTH_ROUTES.includes(pathname)) {
                router.push(DEFAULT_REDIRECT_AUTHENTICATED);
            }
        }
    } else {
        const isAuthRoute = AUTH_ROUTES.includes(pathname);
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
        if (!isAuthRoute && !isPublicRoute) {
            router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
        }
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (user?.id && !user.isAnonymous) {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (querySnapshot) => {
        const fetchedNotifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: (doc.data().timestamp as any)?.toDate ? (doc.data().timestamp as any).toDate().toISOString() : new Date().toISOString()
        } as NotificationType));
        setNotifications(fetchedNotifications);
      }, async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      return () => unsubscribeNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, toast]);


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
        friendlyMessage = "Google Sign-In was cancelled or the popup was closed. Please try again.";
        break;
      case 'auth/popup-blocked':
        title = "Google Sign-In Blocked";
        friendlyMessage = "Google Sign-In popup was blocked by your browser. Please allow pop-ups for this site.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "A network error occurred. Please check your connection.";
        break;
      default:
        friendlyMessage = `An error occurred: ${error.message}.`;
    }
    toast({ title: title, description: friendlyMessage, variant: "destructive" });
  };
  
  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        toast({ title: "Verification Email Sent", description: "A new verification link has been sent to your email address." });
      } catch (error) {
        handleAuthError(error as AuthError, "Send Verification Email");
      }
    }
  };

  const reloadUser = async () => {
      if (auth.currentUser) {
          await auth.currentUser.reload();
          const refreshedUser = auth.currentUser;
          if (refreshedUser?.emailVerified) {
              setUser(prevUser => prevUser ? { ...prevUser, emailVerified: true } : null);
              toast({ title: "Email Verified!", description: "Thank you for verifying your email." });
              router.push('/');
          } else {
              toast({ title: "Not Yet Verified", description: "Please check your email and click the verification link.", variant: "destructive" });
          }
      }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        setRequiresPasswordSetup(true);
        toast({ title: "Account Created!", description: "Welcome! Please set a password for your account." });
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
        const usernameToSet = username.trim().toLowerCase();
        const usernameRegex = /^[a-z0-9_]+$/;
        
        if (!usernameRegex.test(usernameToSet)) {
            toast({
                title: "Invalid Username",
                description: "Usernames can only contain lowercase letters, numbers, and underscores.",
                variant: "destructive"
            });
            setAuthLoading(false);
            return;
        }

        const usernameQuery = query(collection(db, 'users'), where('username', '==', usernameToSet));
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
  
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      await sendEmailVerification(userCredential.user);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: usernameToSet });
        const userRef = doc(db, 'users', userCredential.user.uid);
        const isOwner = OWNER_USERNAMES.includes(usernameToSet);
        
        const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          username: usernameToSet,
          displayName: usernameToSet,
          email: email,
          emailVerified: userCredential.user.emailVerified,
          avatarUrl: `https://placehold.co/100x100.png?text=${usernameToSet.charAt(0).toUpperCase()}`,
          bio: 'New to LitVerse! Ready to explore.',
          role: isOwner ? 'admin' : 'reader',
          isVerified: isOwner,
          messagingPreference: 'everyone',
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
        setDoc(userRef, newUserProfile, { merge: true }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'write',
                requestResourceData: newUserProfile,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: "Sign Up Successful", description: "Account created. Please verify your email." });
      }
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmailPassword = async ({ emailOrUsername, passwordOne }: { emailOrUsername: string; passwordOne: string; }) => {
    setAuthLoading(true);
    let email = emailOrUsername.trim().toLowerCase();

    try {
      if (!email.includes('@')) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          email = userData.email;
        }
      }

      await firebaseSignInWithEmailAndPassword(auth, email, passwordOne);
      toast({ title: "Sign In Successful" });

    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFirebase = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      sessionStorage.removeItem(USER_CACHE_KEY);
      toast({ title: "Signed Out" });
      router.push('/');
    } catch (error) {
      handleAuthError(error as AuthError, "Sign Out");
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    try {
      if (updates.username && updates.username !== user?.username) {
          const usernameToSet = updates.username.trim().toLowerCase();
          const usernameQuery = query(collection(db, 'users'), where('username', '==', usernameToSet));
          const usernameSnapshot = await getDocs(usernameQuery);
          if (!usernameSnapshot.empty) {
              toast({ title: "Username Taken", variant: "destructive" });
              setAuthLoading(false);
              return;
          }
          updates.username = usernameToSet;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const dataToUpdate = { ...updates, updatedAt: serverTimestamp() };
      
      updateDoc(userRef, dataToUpdate).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'update',
              requestResourceData: dataToUpdate,
          });
          errorEmitter.emit('permission-error', permissionError);
      });
      
      if (updates.displayName || updates.avatarUrl) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: updates.displayName,
          photoURL: updates.avatarUrl
        });
      }
      toast({ title: "Profile Updated" });
    } catch (error: any) {
        handleAuthError(error as AuthError, "Profile Update");
    } finally {
      setAuthLoading(false);
    }
  };
  
  const reauthenticate = async (currentPasswordForReAuth: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) return false;
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
    if (!firebaseUser) return false;
    setAuthLoading(true);
    const reauthenticated = await reauthenticate(currentPasswordForReAuth);
    if (!reauthenticated) {
        setAuthLoading(false);
        return false;
    }
    
    try {
        await updateFirebaseEmail(firebaseUser, newEmail);
        const userRef = doc(db, 'users', firebaseUser.uid);
        const updateData = { email: newEmail, updatedAt: serverTimestamp() };
        updateDoc(userRef, updateData).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: "Email Updated" });
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
    if (!firebaseUser) return false;
    setAuthLoading(true);
    const reauthenticated = await reauthenticate(currentPasswordForReAuth);
     if (!reauthenticated) {
        setAuthLoading(false);
        return false;
    }
    try {
        await updateFirebasePassword(firebaseUser, newPasswordVal);
        toast({ title: "Password Updated" });
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
    if (!firebaseUser) return false;
    setAuthLoading(true);
    try {
      await updateFirebasePassword(firebaseUser, newPasswordVal);
      toast({ title: "Password Set!" });
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
      toast({ title: "Reset Link Sent" });
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
    if (!messaging) return;
    setAuthLoading(true);
    try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
            if (!vapidKey) {
                setAuthLoading(false);
                return;
            }
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken && user) {
                setFcmToken(currentToken);
                const userRef = doc(db, 'users', user.id);
                const updateData = { fcmTokens: arrayUnion(currentToken) };
                updateDoc(userRef, updateData).catch(async (serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: userRef.path,
                        operation: 'update',
                        requestResourceData: updateData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
                toast({ title: "Notifications Enabled" });
            }
        }
    } catch (err: any) {
        handleAuthError(err, "Notification Setup");
    } finally {
        setAuthLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(db, 'notifications', notificationId);
    updateDoc(notifRef, { isRead: true }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: notifRef.path,
            operation: 'update',
            requestResourceData: { isRead: true },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    setAuthLoading(true);
    try {
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) {
            setAuthLoading(false);
            return;
        }
        const batch = writeBatch(db);
        unreadNotifications.forEach(n => {
            const notifRef = doc(db, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
        toast({ title: "All Read" });
    } catch (error) {
        console.error(error);
    } finally {
        setAuthLoading(false);
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!user || user.isAnonymous) return;
    setAuthLoading(true);
    const currentUserRef = doc(db, "users", user.id);
    const batch = writeBatch(db);
    const newFollowingIds = Array.from(new Set([...(user.followingIds || []), targetUserId]));
    batch.update(currentUserRef, { followingIds: newFollowingIds, followingCount: newFollowingIds.length, updatedAt: serverTimestamp() });
    try {
      await batch.commit();
      toast({title: "Followed"});
    } catch (error) {
      toast({title: "Error", variant: "destructive"});
    } finally {
      setAuthLoading(false);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user || user.isAnonymous) return;
    setAuthLoading(true);
    const currentUserRef = doc(db, "users", user.id);
    const batch = writeBatch(db);
    const newFollowingIds = (user.followingIds || []).filter(id => id !== targetUserId);
    batch.update(currentUserRef, { followingIds: newFollowingIds, followingCount: newFollowingIds.length, updatedAt: serverTimestamp() });
    try {
      await batch.commit();
      toast({title: "Unfollowed"});
    } catch (error) {
      toast({title: "Error", variant: "destructive"});
    } finally {
      setAuthLoading(false);
    }
  };

  const addToLibrary = async (story: Story) => {
    if (!user || user.isAnonymous) return;
    setAuthLoading(true);
    const userRef = doc(db, 'users', user.id);
    const itemToAdd: ReadingListItem = { id: story.id, title: story.title, author: story.author, chapters: story.chapters || [], lastUpdated: story.lastUpdated, coverImageUrl: story.coverImageUrl, status: story.status };
    updateDoc(userRef, { readingList: arrayUnion(itemToAdd) })
      .then(() => toast({ title: "Added to Library" }))
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: { readingList: 'arrayUnion(...)' },
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setAuthLoading(false));
  };

  const removeFromLibrary = async (storyId: string) => {
    if (!user || !user.readingList) return;
    setAuthLoading(true);
    const userRef = doc(db, 'users', user.id);
    const itemToRemove = user.readingList.find(item => item.id === storyId);
    if (itemToRemove) {
      updateDoc(userRef, { readingList: arrayRemove(itemToRemove) })
        .then(() => toast({ title: "Removed from Library" }))
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { readingList: 'arrayRemove(...)' },
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setAuthLoading(false));
    } else {
        setAuthLoading(false);
    }
  };

  const addNotification = async (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => {
      // Proxy to server action
      await addNotificationAction(notificationData);
  }

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
