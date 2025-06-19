
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType, NotificationType, UserSummary } from '@/types';
import { auth } from '@/lib/firebase';
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
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { placeholderUsers, placeholderNotifications } from '@/lib/placeholder-data';

interface AppUser extends AppUserType {
  email?: string;
  displayName?: string;
  role?: 'reader' | 'writer';
  followingIds?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  notifications: NotificationType[];
  addNotification: (notification: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const PUBLIC_ROUTES: string[] = ['/', '/stories', '/search', '/profile/']; // Allow homepage, stories, search, and public profiles
const DEFAULT_REDIRECT_AUTHENTICATED = '/profile';
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        // Base details from Firebase
        let appUsername = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User';
        let appDisplayName = firebaseUser.displayName || appUsername;
        let appAvatarUrl = firebaseUser.photoURL;
        let appEmail = firebaseUser.email || undefined;

        // Details from sessionStorage (custom username, bio, role, social)
        let userRole: 'reader' | 'writer' | undefined = 'reader';
        let userBio: string | undefined = "No bio yet.";
        let userFollowingIds: string[] = [];
        let userFollowersCount = 0;
        
        try {
          const storedUserDetailsString = sessionStorage.getItem(`userDetails-${firebaseUser.uid}`);
          if (storedUserDetailsString) {
            const storedUserDetails = JSON.parse(storedUserDetailsString);
            userRole = storedUserDetails.role || userRole;
            userBio = storedUserDetails.bio || userBio;
            if (storedUserDetails.username) appUsername = storedUserDetails.username; // Custom username overrides
            if (storedUserDetails.displayName) appDisplayName = storedUserDetails.displayName; // Custom display name
            userFollowingIds = storedUserDetails.followingIds || [];
            // followersCount is not reliably stored/updated in session for this mock, better to get from placeholder if exists
          }
        } catch (e) { console.error("Error parsing stored user details from sessionStorage", e); }

        // Fallback to placeholderUsers for initial social stats or if no session data
        const pUserMatch = placeholderUsers.find(pu => pu.id === firebaseUser.uid || pu.email === firebaseUser.email);
        if (pUserMatch) {
          if (!sessionStorage.getItem(`userDetails-${firebaseUser.uid}`)) { // If no session details yet, use placeholder as base
            userRole = pUserMatch.role || userRole;
            userBio = pUserMatch.bio || userBio;
            appUsername = pUserMatch.username || appUsername; // Placeholder username can be a good default
            appDisplayName = pUserMatch.displayName || appDisplayName;
            appAvatarUrl = appAvatarUrl || pUserMatch.avatarUrl;
          }
          userFollowersCount = pUserMatch.followersCount || 0; // Get initial follower count
           // Ensure followingIds from session take precedence if they exist, else from placeholder
          userFollowingIds = sessionStorage.getItem(`userDetails-${firebaseUser.uid}`) ? userFollowingIds : (pUserMatch.followingIds || []);
        }
        
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: appUsername,
          displayName: appDisplayName,
          avatarUrl: appAvatarUrl || `https://placehold.co/100x100.png?text=${appUsername.charAt(0).toUpperCase()}`,
          email: appEmail,
          bio: userBio,
          role: userRole,
          followersCount: userFollowersCount,
          followingCount: userFollowingIds.length,
          followingIds: userFollowingIds,
          writtenStories: pUserMatch?.writtenStories || [], // Mocked
          readingList: pUserMatch?.readingList || [], // Mocked
        };
        setUser(appUser);

        // Persist potentially merged/defaulted details back to sessionStorage
        const sessionDetailsToStore = { 
            role: appUser.role, 
            bio: appUser.bio, 
            username: appUser.username, 
            displayName: appUser.displayName,
            followingIds: appUser.followingIds 
        };
        sessionStorage.setItem(`userDetails-${firebaseUser.uid}`, JSON.stringify(sessionDetailsToStore));
        
        // Mock notifications - filter some relevant notifications for the current user
        setNotifications(
          placeholderNotifications.filter(n => {
            const isRecipient = n.link?.includes(`/profile/${appUser.id}`) || // e.g. new follower for this user
                                (n.type === 'comment_reply' && n.message.includes(appUser.displayName || appUser.username)); 
            const isGlobal = n.type === 'announcement';
            const isOwnActionRelevant = n.actor?.id === appUser.id && (n.type === 'new_chapter' || n.type === 'story_update');
            return isRecipient || isGlobal || isOwnActionRelevant;
          }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,10)
        );

      } else {
        setUser(null);
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isPublicRouteAccessible = PUBLIC_ROUTES.some(route => {
        if (route.endsWith('/')) { // For routes like /profile/
            return pathname.startsWith(route);
        }
        return route === pathname; // For exact matches like / or /stories
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
      // User details will be processed by onAuthStateChanged
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${result.user.displayName || result.user.email}! Redirecting...` });
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
        // Store initial custom details in sessionStorage for onAuthStateChanged to pick up
        const defaultRole = 'reader';
        const defaultBio = "New user exploring D4RKV3NOM!";
        const initialFollowingIds: string[] = [];
        const sessionDetails = { 
            username: username, // Store the chosen username
            displayName: username, // Also set displayName in session
            role: defaultRole, 
            bio: defaultBio, 
            followingIds: initialFollowingIds 
        };
        sessionStorage.setItem(`userDetails-${userCredential.user.uid}`, JSON.stringify(sessionDetails));
        // onAuthStateChanged will handle setting the user state
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

    if (!emailOrUsername.includes('@')) { // Assume it's a username
      const foundUser = placeholderUsers.find(pUser => pUser.username.toLowerCase() === emailOrUsername.toLowerCase());
      if (foundUser && foundUser.email) {
        emailToUse = foundUser.email;
      } else {
        setAuthLoading(false);
        toast({
          title: "Sign-In Failed",
          description: `Username "${emailOrUsername}" not found. Please check your username or sign in with your email address. (Note: Username lookup is currently based on pre-defined mock data).`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      await firebaseSignInWithEmailAndPassword(auth, emailToUse, passwordOne);
      // onAuthStateChanged will handle setting the user state
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
      // sessionStorage.removeItem('userDetails-...'); // Not strictly needed as onAuthStateChanged handles user to null
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
      const { displayName, avatarUrl, bio, role, username, followingIds } = updates;
      
      const profileUpdatesForFirebase: { displayName?: string | null; photoURL?: string | null } = {};
      // Only update displayName in Firebase if it's explicitly part of 'updates'
      // and different from current Firebase displayName (or if current is null)
      if (displayName !== undefined && displayName !== auth.currentUser.displayName) {
          profileUpdatesForFirebase.displayName = displayName;
      }
      if (avatarUrl !== undefined && avatarUrl !== auth.currentUser.photoURL) {
          profileUpdatesForFirebase.photoURL = avatarUrl;
      }

      if (Object.keys(profileUpdatesForFirebase).length > 0) {
        await updateFirebaseProfile(auth.currentUser, profileUpdatesForFirebase);
      }
      
      // Update local user state and sessionStorage
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = {
          ...prevUser,
          ...(displayName !== undefined && { displayName }),
          ...(username !== undefined && { username }), // custom username
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(bio !== undefined && { bio }),
          ...(role !== undefined && { role }),
          ...(followingIds !== undefined && { followingIds, followingCount: followingIds.length }),
        };
        
        const sessionDetailsToStore = { 
            role: updatedUser.role, 
            bio: updatedUser.bio, 
            username: updatedUser.username,
            displayName: updatedUser.displayName, 
            followingIds: updatedUser.followingIds 
        };
        sessionStorage.setItem(`userDetails-${updatedUser.id}`, JSON.stringify(sessionDetailsToStore));
        return updatedUser;
      });

      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    } catch (error) {
      handleAuthError(error as AuthError, "Profile Update");
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
    try {
        await updateFirebaseEmail(firebaseUser, newEmail);
        setUser(prev => prev ? ({ ...prev, email: newEmail }) : null);
        toast({ title: "Email Updated", description: `Your email has been successfully updated to ${newEmail}. You might need to sign in again.` });
        setAuthLoading(false);
        return true;
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Re-authentication Required", description: "Please enter your current password to verify and try again.", variant: "destructive" });
        const reauthenticated = await reauthenticate(currentPasswordForReAuth);
        if (reauthenticated) {
          try {
            await updateFirebaseEmail(firebaseUser, newEmail);
            setUser(prev => prev ? ({ ...prev, email: newEmail }) : null);
            toast({ title: "Email Updated", description: `Your email has been successfully updated to ${newEmail} after re-authentication.` });
            setAuthLoading(false);
            return true;
          } catch (retryError) {
            handleAuthError(retryError as AuthError, "Email Update after Re-auth");
          }
        }
      } else {
        handleAuthError(error as AuthError, "Email Update");
      }
      setAuthLoading(false);
      return false;
    }
  };

  const updateUserPasswordFirebase = async (currentPasswordForReAuth: string, newPasswordVal: string): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    setAuthLoading(true);
    try {
        await updateFirebasePassword(firebaseUser, newPasswordVal);
        toast({ title: "Password Updated", description: "Your password has been successfully changed." });
        setAuthLoading(false);
        return true;
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Re-authentication Required", description: "Please enter your current password to verify and try again.", variant: "destructive" });
        const reauthenticated = await reauthenticate(currentPasswordForReAuth);
        if (reauthenticated) {
          try {
            await updateFirebasePassword(firebaseUser, newPasswordVal);
            toast({ title: "Password Updated", description: "Your password has been successfully changed after re-authentication." });
            setAuthLoading(false);
            return true;
          } catch (retryError) {
            handleAuthError(retryError as AuthError, "Password Update after Re-auth");
          }
        }
      } else {
        handleAuthError(error as AuthError, "Password Update");
      }
      setAuthLoading(false);
      return false;
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

  const addNotification = (notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: NotificationType = {
      ...notificationData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications(prev => [newNotif, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  const followUser = async (targetUserId: string) => {
    if (!user) return;
    setAuthLoading(true);
    
    const newFollowingIds = Array.from(new Set([...(user.followingIds || []), targetUserId]));
    setUser(prev => prev ? { 
        ...prev, 
        followingIds: newFollowingIds, 
        followingCount: newFollowingIds.length 
    } : null);
    
    const currentSessionDetails = JSON.parse(sessionStorage.getItem(`userDetails-${user.id}`) || '{}');
    currentSessionDetails.followingIds = newFollowingIds;
    sessionStorage.setItem(`userDetails-${user.id}`, JSON.stringify(currentSessionDetails));
    
    // Mock: Update target user's followers count in placeholderUsers (for demo display if target profile is viewed)
    // This is a mock and doesn't affect a real backend.
    const targetUserIndex = placeholderUsers.findIndex(u => u.id === targetUserId);
    if (targetUserIndex !== -1) {
      // To avoid double-counting if already followed in mock data, check first
      // This part is tricky with mock data; a real backend would handle atomicity.
      // For simplicity in mock, we just increment.
      const alreadyFollowedInMock = placeholderUsers[targetUserIndex].followers?.some(f => f.id === user.id);
      if (!alreadyFollowedInMock) {
          placeholderUsers[targetUserIndex].followersCount = (placeholderUsers[targetUserIndex].followersCount || 0) + 1;
          // Add to mock follower list if that exists
          if(placeholderUsers[targetUserIndex].followers){
            placeholderUsers[targetUserIndex].followers?.push({id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl});
          } else {
            placeholderUsers[targetUserIndex].followers = [{id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl}];
          }
      }
    }
    
    const targetUserDetails = placeholderUsers.find(u=>u.id === targetUserId);
    if (targetUserDetails) {
        addNotification({
            type: 'new_follower',
            message: `${user.displayName || user.username} started following you.`,
            link: `/profile/${user.id}`, // Link to the follower's profile
            actor: {id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl}
            // This notification should ideally be for targetUserId, but for demo, current user also sees it if they are the target
        });
    }

    toast({title: "Followed", description: `You are now following ${targetUserDetails?.displayName || 'user'}.`});
    setAuthLoading(false);
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    setAuthLoading(true);
    
    const newFollowingIds = (user.followingIds || []).filter(id => id !== targetUserId);
    setUser(prev => prev ? { 
        ...prev, 
        followingIds: newFollowingIds,
        followingCount: newFollowingIds.length 
    } : null);

    const currentSessionDetails = JSON.parse(sessionStorage.getItem(`userDetails-${user.id}`) || '{}');
    currentSessionDetails.followingIds = newFollowingIds;
    sessionStorage.setItem(`userDetails-${user.id}`, JSON.stringify(currentSessionDetails));

    // Mock: Update target user's followers count in placeholderUsers
    const targetUserIndex = placeholderUsers.findIndex(u => u.id === targetUserId);
    if (targetUserIndex !== -1) {
      placeholderUsers[targetUserIndex].followersCount = Math.max(0, (placeholderUsers[targetUserIndex].followersCount || 0) - 1);
       if(placeholderUsers[targetUserIndex].followers){
            placeholderUsers[targetUserIndex].followers = placeholderUsers[targetUserIndex].followers?.filter(f => f.id !== user.id);
        }
    }
    const targetUserDetails = placeholderUsers.find(u=>u.id === targetUserId);
    toast({title: "Unfollowed", description: `You have unfollowed ${targetUserDetails?.displayName || 'user'}.`});
    setAuthLoading(false);
  };


  return (
    <AuthContext.Provider value={{
        user,
        loading,
        authLoading,
        notifications,
        addNotification,
        markNotificationAsRead,
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
