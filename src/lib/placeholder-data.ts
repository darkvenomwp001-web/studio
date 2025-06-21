
import type { Story, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { db } from './firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// This file is now for utility functions and async data fetching helpers, not for storing mock data.

export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching user by username from Firestore:", error);
    return undefined;
  }
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return undefined;
  } catch (error) {
     console.error("Error fetching user by ID from Firestore:", error);
     return undefined;
  }
};


export const formatDate = (dateInput?: string | Date | { seconds: number, nanoseconds: number }): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'object' && 'seconds' in dateInput && 'nanoseconds' in dateInput) {
    // Handle Firestore Timestamp object
    date = new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
  } else {
    return 'Invalid Date';
  }

  try {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24 * 7) { 
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e, "Input was:", dateInput);
    return 'Invalid Date';
  }
};
