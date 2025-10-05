
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

export async function createThreadPost(postData: Omit<ThreadPost, 'id' | 'timestamp' | 'likesCount' | 'commentsCount' | 'likedBy'>): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'feedPosts'), {
      ...postData,
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
      reactions: {},
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

export async function toggleReaction(postId: string, reactionType: ReactionType, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'You must be signed in to react.' };
    }
    
    const postRef = doc(db, 'feedPosts', postId);

    try {
        await runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Post not found";
            }
            
            const postData = postDoc.data();
            const reactions = postData.reactions || {};
            const currentReaction = reactions[userId];

            if (currentReaction === reactionType) {
                // User is removing their reaction
                delete reactions[userId];
            } else {
                // User is adding or changing their reaction
                reactions[userId] = reactionType;
            }

            transaction.update(postRef, { reactions });
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error toggling reaction:", error);
        return { success: false, error: 'Could not save reaction.' };
    }
}
