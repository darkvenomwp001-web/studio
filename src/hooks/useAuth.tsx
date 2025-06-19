
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType } from '@/types';
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
import { placeholderUsers } from '@/lib/placeholder-data';

interface SignUpData {
  username: string;
  email: string;
  passwordOne: string;
}

interface SignInData {
  emailOrUsername: string;
  passwordOne: string;
}

interface AppUser extends AppUserType {
  email?: string;
  displayName?: string;
  role?: 'reader' | 'writer';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: SignUpData) => Promise<void>;
  signInWithEmailPassword: (data: SignInData) => Promise<void>;
  signOutFirebase: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<void>;
  updateUserEmailFirebase: (newEmail: string, currentPasswordForReAuth: string) => Promise<boolean>;
  updateUserPasswordFirebase: (currentPasswordForReAuth: string, newPasswordVal: string) => Promise<boolean>;
  sendPasswordResetFirebase: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const PUBLIC_ROUTES: string[] = [];
const DEFAULT_REDIRECT_AUTHENTICATED = '/';
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        let userRole: 'reader' | 'writer' | undefined = undefined;
        let userBio: string | undefined = undefined;
        let appUsername = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User';

        try {
          const storedUserDetails = sessionStorage.getItem(`userDetails-${firebaseUser.uid}`);
          if (storedUserDetails) {
            const details = JSON.parse(storedUserDetails);
            userRole = details.role;
            userBio = details.bio;
            if(details.username) appUsername = details.username;
          }
        } catch (e) { console.error("Error parsing stored user details from sessionStorage", e); }
        
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: appUsername,
          displayName: firebaseUser.displayName || appUsername,
          avatarUrl: firebaseUser.photoURL || undefined,
          email: firebaseUser.email || undefined,
          bio: userBio || placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.bio || "No bio yet.",
          role: userRole || placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.role || 'reader',
          writtenStories: placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.writtenStories || [],
          readingList: placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.readingList || [],
          followersCount: placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.followersCount || 0,
          followingCount: placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.followingCount || 0,
        };
        setUser(appUser);
        if (!sessionStorage.getItem(`userDetails-${firebaseUser.uid}`) || 
            (sessionStorage.getItem(`userDetails-${firebaseUser.uid}`) && 
             JSON.stringify({ role: appUser.role, bio: appUser.bio, username: appUser.username }) !== sessionStorage.getItem(`userDetails-${firebaseUser.uid}`))) {
            sessionStorage.setItem(`userDetails-${firebaseUser.uid}`, JSON.stringify({ role: appUser.role, bio: appUser.bio, username: appUser.username }));
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (user) {
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else {
      if (!isAuthRoute && !isPublicRoute) {
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
        friendlyMessage = "No account found with this email. Please check your email or sign up.";
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
        title = "Account Linking Issue";
        friendlyMessage = "An account already exists with this email address but may have been created using a different sign-in method (e.g., Email/Password if you're trying Google Sign-In). For Google Sign-In to access this existing account, your Firebase project's 'User account linking' setting (Authentication -> Settings) MUST be configured to 'Link accounts that use the same email address'. Please verify this setting in your Firebase Console. Alternatively, sign in using your original method.";
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
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${result.user.displayName || result.user.email}! Redirecting...` });
    } catch (error) {
      handleAuthError(error as AuthError, "Google Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async ({ email, passwordOne, username }: SignUpData) => {
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      if (userCredential.user) {
        await updateFirebaseProfile(userCredential.user, { displayName: username });
        const defaultRole = 'reader';
        const defaultBio = "New user exploring LitVerse!";
        sessionStorage.setItem(`userDetails-${userCredential.user.uid}`, JSON.stringify({ role: defaultRole, bio: defaultBio, username: username }));
        setUser(prevUser => ({
            ...(prevUser as AppUser),
            id: userCredential.user.uid,
            username: username,
            displayName: username,
            email: email,
            role: defaultRole,
            bio: defaultBio,
            avatarUrl: userCredential.user.photoURL || undefined
        }));
      }
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithEmailPassword = async ({ emailOrUsername, passwordOne }: SignInData) => {
    setAuthLoading(true);
    let emailToUse = emailOrUsername;

    if (!emailOrUsername.includes('@')) {
      const foundUser = placeholderUsers.find(pUser => pUser.username.toLowerCase() === emailOrUsername.toLowerCase());
      if (foundUser && foundUser.email) {
        emailToUse = foundUser.email;
      } else {
        setAuthLoading(false);
        toast({
          title: "Sign-In Failed",
          description: `Username "${emailOrUsername}" not found. Please check your username or sign in with your email address.`,
          variant: "destructive",
        });
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
      if (user) {
        sessionStorage.removeItem(`userDetails-${user.id}`);
      }
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
      const { displayName, avatarUrl, bio, role, username } = updates;
      
      const profileUpdatesForFirebase: { displayName?: string | null; photoURL?: string | null } = {};
      if (displayName !== undefined) profileUpdatesForFirebase.displayName = displayName;
      if (avatarUrl !== undefined) profileUpdatesForFirebase.photoURL = avatarUrl;

      if (Object.keys(profileUpdatesForFirebase).length > 0) {
        await updateFirebaseProfile(auth.currentUser, profileUpdatesForFirebase);
      }
      
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = {
          ...prevUser,
          ...(displayName !== undefined && { displayName }),
          ...(username !== undefined && { username }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(bio !== undefined && { bio }),
          ...(role !== undefined && { role }),
        };
        sessionStorage.setItem(`userDetails-${updatedUser.id}`, JSON.stringify({ role: updatedUser.role, bio: updatedUser.bio, username: updatedUser.username }));
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
      toast({ title: "Error", description: "User not found or email missing.", variant: "destructive" });
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
      toast({ title: "Email Updated", description: `Your email has been successfully updated to ${newEmail}.` });
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

  return (
    <AuthContext.Provider value={{
        user,
        loading,
        authLoading,
        signInWithGoogle,
        signUpWithEmailPassword,
        signInWithEmailPassword,
        signOutFirebase,
        updateUserProfile,
        updateUserEmailFirebase,
        updateUserPasswordFirebase,
        sendPasswordResetFirebase
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
