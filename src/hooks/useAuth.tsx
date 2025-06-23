
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType, NotificationType, UserSummary, Story, ReadingListItem } from '@/types';
import { auth, db } from '@/lib/firebase';
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
  addDoc,
  writeBatch,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AppUser extends AppUserType {
  email?: string;
  displayName?: string;
  role?: 'reader' | 'writer';
  followingIds?: string[];
  createdAt?: any; 
  updatedAt?: any; 
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  notifications: NotificationType[];
  requiresPasswordSetup: boolean;
  addNotification: (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
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
const PUBLIC_ROUTES: string[] = ['/', '/stories', '/search', '/profile/', '/write/history', '/settings', '/library'];
const DEFAULT_REDIRECT_AUTHENTICATED = '/';
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (firebaseUser) {
        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const firestoreUserData = userSnap.data() as AppUser;
            // Fetch the user's written stories to populate the `writtenStories` field
            const storiesQuery = query(collection(db, "stories"), where("author.id", "==", firebaseUser.uid));
            const storiesSnapshot = await getDocs(storiesQuery);
            const writtenStories = storiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || firestoreUserData.email,
              username: firestoreUserData.username || firebaseUser.displayName?.split(' ')[0] || 'User',
              displayName: firestoreUserData.displayName || firebaseUser.displayName || firestoreUserData.username,
              avatarUrl: firestoreUserData.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firestoreUserData.username || 'U').charAt(0).toUpperCase()}`,
              bio: firestoreUserData.bio || 'No bio yet.',
              role: firestoreUserData.role || 'reader',
              followersCount: firestoreUserData.followersCount || 0,
              followingCount: firestoreUserData.followingIds?.length || 0,
              followingIds: firestoreUserData.followingIds || [],
              writtenStories: writtenStories,
              readingList: firestoreUserData.readingList || [],
              createdAt: firestoreUserData.createdAt,
              updatedAt: firestoreUserData.updatedAt,
            });
          } else {
            // This logic runs once if the user document doesn't exist, e.g., on first Google Sign-In
            const username = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0,5)}`;
            const newUserProfile: AppUser = {
              id: firebaseUser.uid,
              username: username,
              displayName: firebaseUser.displayName || username,
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${username.charAt(0).toUpperCase()}`,
              bio: 'New to LitVerse! Ready to explore.',
              role: 'reader',
              followersCount: 0,
              followingCount: 0,
              followingIds: [],
              writtenStories: [],
              readingList: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, newUserProfile, { merge: true });
            setUser(newUserProfile); // The snapshot listener will also fire and set this, but we set it here for immediate feedback
          }
          setLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            setUser(null);
            setLoading(false);
        });
        
      } else {
        setUser(null);
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);


  useEffect(() => {
    if (user?.id) {
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
        toast({ title: "Error", description: "Could not load notifications.", variant: "destructive"});
      });
      return () => unsubscribeNotifications();
    } else {
      setNotifications([]); // Clear notifications if no user
    }
  }, [user, toast]);


  useEffect(() => {
    if (loading) return;
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: username });
        const userRef = doc(db, 'users', userCredential.user.uid);
        const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          username: username,
          displayName: username,
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newUserProfile, { merge: true });
      }
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmailPassword = async ({ emailOrUsername, passwordOne }: { emailOrUsername: string; passwordOne: string; }) => {
    setAuthLoading(true);
    let emailToUse = emailOrUsername;

    if (!emailOrUsername.includes('@')) {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", emailOrUsername));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                emailToUse = querySnapshot.docs[0].data().email;
            } else {
                setAuthLoading(false);
                toast({
                    title: "Sign-In Failed",
                    description: `Username "${emailOrUsername}" not found.`,
                    variant: "destructive",
                });
                return;
            }
        } catch (e) {
            setAuthLoading(false);
            toast({ title: "Error", description: "Could not verify username.", variant: "destructive" });
            return;
        }
    }
    
    try {
      await firebaseSignInWithEmailAndPassword(auth, emailToUse, passwordOne);
      toast({ title: "Sign In Successful", description: "You are now signed in. Redirecting..." });
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

      // Build the update object explicitly to avoid issues with undefined properties
      const dataToUpdate: { [key: string]: any } = {
        updatedAt: serverTimestamp()
      };
      if (updates.displayName !== undefined) dataToUpdate.displayName = updates.displayName;
      if (updates.username !== undefined) dataToUpdate.username = updates.username;
      if (updates.bio !== undefined) dataToUpdate.bio = updates.bio;
      if (updates.role !== undefined) dataToUpdate.role = updates.role;
      if (updates.avatarUrl !== undefined && updates.avatarUrl !== user?.avatarUrl) {
          dataToUpdate.avatarUrl = updates.avatarUrl;
      }
      
      // Also update the core Firebase Auth profile for displayName and photoURL
      const firebaseProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
      if (updates.displayName !== undefined && updates.displayName !== auth.currentUser.displayName) {
        firebaseProfileUpdates.displayName = updates.displayName;
      }
      if (updates.avatarUrl !== undefined && updates.avatarUrl !== auth.currentUser.photoURL) {
        firebaseProfileUpdates.photoURL = updates.avatarUrl;
      }

      if (Object.keys(firebaseProfileUpdates).length > 0) {
        await updateFirebaseProfile(auth.currentUser, firebaseProfileUpdates);
      }
      
      await updateDoc(userRef, dataToUpdate);
      
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

  const addNotification = useCallback(async (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotifData = {
      ...notificationData,
      timestamp: serverTimestamp(),
      isRead: false,
    };
    try {
      await addDoc(collection(db, 'notifications'), newNotifData);
    } catch (error) {
      console.error("Error adding notification to Firestore:", error);
      toast({ title: "Error", description: "Could not create notification.", variant: "destructive" });
    }
  }, [toast]);

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
    if (!user) return;
    setAuthLoading(true);
    
    const currentUserRef = doc(db, "users", user.id);
    const targetUserRef = doc(db, "users", targetUserId);
    const batch = writeBatch(db);

    try {
        const newFollowingIds = Array.from(new Set([...(user.followingIds || []), targetUserId]));
        
        batch.update(currentUserRef, {
            followingIds: newFollowingIds,
            followingCount: newFollowingIds.length,
            updatedAt: serverTimestamp()
        });

        batch.update(targetUserRef, {
            followersCount: increment(1),
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        
        const targetUserSnap = await getDoc(targetUserRef);
        if(targetUserSnap.exists()){
            const targetUserData = targetUserSnap.data();
            toast({title: "Followed", description: `You are now following ${targetUserData?.displayName || targetUserData?.username || 'user'}.`});
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
    } catch (error) {
        console.error("Error following user:", error);
        toast({title: "Error", description: "Could not follow user.", variant: "destructive"});
    } finally {
        setAuthLoading(false);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    setAuthLoading(true);
    const currentUserRef = doc(db, "users", user.id);
    const targetUserRef = doc(db, "users", targetUserId);
    const batch = writeBatch(db);

    try {
        const newFollowingIds = (user.followingIds || []).filter(id => id !== targetUserId);
        
        batch.update(currentUserRef, {
            followingIds: newFollowingIds,
            followingCount: newFollowingIds.length,
            updatedAt: serverTimestamp()
        });

        batch.update(targetUserRef, {
            followersCount: increment(-1),
            updatedAt: serverTimestamp()
        });
        
        await batch.commit();

        const targetUserSnap = await getDoc(targetUserRef);
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
    setAuthLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      
      // Build the itemToAdd object carefully, excluding any undefined fields to prevent Firestore errors.
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
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
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
