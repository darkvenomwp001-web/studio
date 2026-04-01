
'use server';

import { db } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { NotificationType } from '@/types';

// This server action triggers a notification document in Firestore.
// In a full implementation, a Cloud Function would watch this collection
// and send a real push notification to the user's FCM tokens.

export async function addNotification(notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
  const newNotifData = {
    ...notificationData,
    timestamp: serverTimestamp(),
    isRead: false,
  };
  try {
    await addDoc(collection(db, 'notifications'), newNotifData);
    
    // --- Push Notification Simulation Logic ---
    // Normally, a Cloud Function would:
    // 1. Get user's stored fcmTokens from Firestore
    // 2. Use admin.messaging().sendEachForMulticast(payload)
    // 3. Payload would include title, body, and the redirect link
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
  }
}
