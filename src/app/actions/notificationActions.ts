
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { NotificationType } from '@/types';

// TODO: The following function adds a notification to the Firestore database.
// To send a real-time push notification, you would typically use a Firebase Function
// that triggers on the creation of a new document in the 'notifications' collection.
// This function would use the Firebase Admin SDK to get the recipient's FCM tokens
// from their user document and send a message via Firebase Cloud Messaging (FCM).

export async function addNotification(notificationData: Omit<NotificationType, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
  const newNotifData = {
    ...notificationData,
    timestamp: serverTimestamp(),
    isRead: false,
  };
  try {
    await addDoc(collection(db, 'notifications'), newNotifData);
    
    // --- Backend Trigger Point ---
    // In a full implementation, the creation of this document would trigger a
    // Cloud Function. The function would look like this:
    /*
    functions.firestore.document('notifications/{notificationId}')
      .onCreate(async (snap, context) => {
        const notification = snap.data();
        const userId = notification.userId;

        // 1. Get user's FCM tokens from Firestore
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens;

        if (fcmTokens && fcmTokens.length > 0) {
          // 2. Construct the push notification payload
          const payload = {
            notification: {
              title: 'New Notification on LitVerse!',
              body: notification.message,
              icon: notification.actor.avatarUrl || '/favicon.ico',
            },
            webpush: {
                fcmOptions: {
                    link: notification.link
                }
            }
          };

          // 3. Send the message to the user's devices
          await admin.messaging().sendToDevice(fcmTokens, payload);
        }
      });
    */

  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
    // Depending on requirements, you might want to re-throw or handle this differently
  }
}
