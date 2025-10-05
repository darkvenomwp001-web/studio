
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  runTransaction,
  increment,
  setDoc,
} from 'firebase/firestore';
import type { UserSummary, ThreadPost, ReactionType } from '@/types';
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

export async function createThreadPost(postData: Omit<ThreadPost, 'id' | 'timestamp' | 'commentsCount'>): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'feedPosts'), {
      ...postData,
      reactionsCount: 0,
      commentsCount: 0,
      timestamp: serverTimestamp()
    });
    revalidatePath('/'); // Revalidate the main feed
    return { success: true };
  } catch (error) {
    console.error("Error creating thread post:", error);
    return { success: false, error: "Could not create post." };
  }
}

export async function updateThreadPost(postId: string, newContent: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  const postRef = doc(db, 'feedPosts', postId);
  try {
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists() || postSnap.data().author.id !== userId) {
      return { success: false, error: 'You do not have permission to edit this post.' };
    }
    await updateDoc(postRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    });
    revalidatePath('/');
    revalidatePath(`/threads/edit/${postId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error: 'Could not update post.' };
  }
}

export async function deleteThreadPost(postId: string, userId: string): Promise<{ success: boolean, error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    const postRef = doc(db, 'feedPosts', postId);
    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            return { success: true }; // Post is already gone
        }
        if (postSnap.data().author.id !== userId) {
            return { success: false, error: 'You do not have permission to delete this post.' };
        }
        await deleteDoc(postRef);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting post:", error);
        return { success: false, error: "Could not delete post." };
    }
}

export async function toggleReaction(postId: string, user: UserSummary): Promise<{ success: boolean; error?: string }> {
    if (!user || !user.id) {
        return { success: false, error: 'You must be signed in to react.' };
    }
    
    const postRef = doc(db, 'feedPosts', postId);
    const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);
    const reactionType: ReactionType = 'love'; // Hardcode to 'love' for the heart reaction

    try {
        await runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            
            if (reactionDoc.exists()) {
                // User has an existing reaction, so remove it (un-react)
                transaction.delete(reactionRef);
                transaction.update(postRef, { reactionsCount: increment(-1) });
            } else {
                // User has no existing reaction, so add a new one
                const userSummary: UserSummary = {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl
                };
                transaction.set(reactionRef, { 
                    userId: user.id, 
                    type: reactionType, 
                    timestamp: serverTimestamp(),
                    user: userSummary // Store user summary for displaying reactors list
                });
                transaction.update(postRef, { reactionsCount: increment(1) });
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error toggling reaction:", error);
        const errorMessage = error instanceof Error ? error.message : 'Could not save reaction.';
        return { success: false, error: errorMessage };
    }
}
