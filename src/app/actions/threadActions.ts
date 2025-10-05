
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

export async function sendGlobalChatMessage(
  author: UserSummary,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  if (!author || !author.id) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Message content cannot be empty.' };
  }

  try {
    const messageData = {
      author,
      content,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'globalChatMessages'), messageData);
    
    // While this is a real-time chat, revalidating can help in some edge cases
    // if we ever build a non-realtime view of this. It's a good practice.
    revalidatePath('/'); 

    return { success: true };
  } catch (error) {
    console.error('Error sending global chat message:', error);
    return { success: false, error: 'Could not send message. Please try again.' };
  }
}

export async function updateThreadPost(
  postId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postRef = doc(db, 'feedPosts', postId);
    // In a real app, you'd add a security check here on the server-side
    // to ensure the user owns this post. Firestore rules handle this for us.
    await updateDoc(postRef, {
      content: newContent
    });
    revalidatePath('/'); // Revalidate the feed
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error: "Could not update post." };
  }
}

export async function hideThreadPost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postRef = doc(db, 'feedPosts', postId);
    // Again, server-side ownership check would go here in a different backend setup.
    await updateDoc(postRef, {
        isHidden: true
    });
    revalidatePath('/'); // Revalidate the feed to hide the post
    return { success: true };
  } catch (error) {
    console.error("Error hiding post:", error);
    return { success: false, error: "Could not hide post." };
  }
}

