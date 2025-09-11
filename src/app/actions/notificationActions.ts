
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { NotificationType } from '@/types';

export async function addNotification(notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
  const newNotifData = {
    ...notificationData,
    timestamp: serverTimestamp(),
    isRead: false,
  };
  try {
    await addDoc(collection(db, 'notifications'), newNotifData);
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
    // Depending on requirements, you might want to re-throw or handle this differently
  }
}
