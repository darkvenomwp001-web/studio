
'use server';

import { db } from '@/lib/firebase-server';
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
  writeBatch,
} from 'firebase/firestore';
import type { UserSummary, ThreadPost, ReactionType } from '@/types';
import { revalidatePath } from 'next/cache';
import { addNotification } from './notificationActions';

const OWNER_HANDLES = ['authorrafaelnv', 'd4rkv3nom'];

async function checkIsAppOwner(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const username = userDoc.data()?.username;
    return OWNER_HANDLES.includes(username);
}

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
    
    revalidatePath('/'); 

    return { success: true };
  } catch (error) {
    console.error('Error sending global chat message:', error);
    return { success: false, error: 'Could not send message. Please try again.' };
  }
}

export async function createThreadPost(postData: Omit<ThreadPost, 'id' | 'timestamp' | 'commentsCount'>): Promise<{ success: boolean; error?: string }> {
    const postCollectionRef = collection(db, 'feedPosts');
    
    const finalPostData = {
        ...postData,
        reactionsCount: 0,
        commentsCount: 0,
        isPinned: false,
        repostCount: 0,
        timestamp: serverTimestamp(),
    };

    try {
        await addDoc(postCollectionRef, finalPostData);
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Error creating thread post:", error);
        if (error.code === 'permission-denied') {
            return { success: false, error: 'Permission denied. You might not be allowed to create posts.' };
        }
        return { success: false, error: 'An unexpected error occurred while creating the post.' };
    }
}

export async function updateThreadPost(postId: string, newContent: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  const postRef = doc(db, 'feedPosts', postId);
  const updateData = {
    content: newContent,
    updatedAt: serverTimestamp(),
  };

  try {
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
          return { success: false, error: 'Post not found.' };
      }
      
      const isOwner = await checkIsAppOwner(userId);
      if (postSnap.data().author.id !== userId && !isOwner) {
          return { success: false, error: 'You do not have permission to edit this post.' };
      }
      
      await updateDoc(postRef, updateData);
      revalidatePath('/');
      revalidatePath(`/threads/edit/${postId}`);
      return { success: true };
  } catch (error: any) {
      console.error("Error updating thread post:", error);
      if (error.code === 'permission-denied') {
          return { success: false, error: 'Permission denied to update this post.' };
      }
      return { success: false, error: 'An unexpected error occurred while updating the post.' };
  }
}

export async function hideThreadPost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    const postRef = doc(db, 'feedPosts', postId);
    try {
        await updateDoc(postRef, { isHidden: true });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error hiding post:", error);
        return { success: false, error: "Could not hide post." };
    }
}


export async function deleteThreadPost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  const postRef = doc(db, 'feedPosts', postId);
  
  try {
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      revalidatePath('/');
      return { success: true };
    }

    const isOwner = await checkIsAppOwner(userId);
    if (postSnap.data().author.id !== userId && !isOwner) {
      return { success: false, error: 'You do not have permission to delete this post.' };
    }

    await deleteDoc(postRef);
    revalidatePath('/');
    return { success: true };

  } catch (error: any) {
    console.error("Error deleting post:", error);
    if (error.code === 'permission-denied') {
        return { success: false, error: 'Permission denied by security rules.' };
    }
    return { success: false, error: "An unexpected error occurred while deleting the post." };
  }
}

export async function toggleReaction(postId: string, user: UserSummary, reactionType: ReactionType): Promise<{ success: boolean; error?: string }> {
    if (!user || !user.id) {
        return { success: false, error: 'You must be signed in to react.' };
    }
    
    const postRef = doc(db, 'feedPosts', postId);
    const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);

    try {
        await runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            
            if (reactionDoc.exists()) {
                transaction.delete(reactionRef);
                transaction.update(postRef, { reactionsCount: increment(-1) });
            } else {
                const reactionData = { 
                    userId: user.id, 
                    type: reactionType,
                    timestamp: serverTimestamp(),
                    user: user
                };
                transaction.set(reactionRef, reactionData);
                transaction.update(postRef, { reactionsCount: increment(1) });
            }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error toggling reaction:', error);
        if (error.code === 'permission-denied') {
            return { success: false, error: 'Permission denied to react to this post.' };
        }
        return { success: false, error: 'An unexpected error occurred while reacting.' };
    }
}


export async function pinThreadPost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    const postRef = doc(db, 'feedPosts', postId);
    
    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            return { success: false, error: 'Post not found.' };
        }
        
        const currentPinStatus = postSnap.data().isPinned || false;
        
        await updateDoc(postRef, { isPinned: !currentPinStatus });
            
        revalidatePath('/');
        return { success: true };
            
    } catch (error: any) {
         console.error('Error pinning post:', error);
        if (error.code === 'permission-denied') {
            return { success: false, error: 'You do not have permission to pin this post.' };
        }
        return { success: false, error: 'Could not read or pin post.' };
    }
}


export async function repostThreadPost(originalPostId: string, user: UserSummary): Promise<{ success: boolean, error?: string }> {
    if (!user || !user.id) {
        return { success: false, error: 'You must be signed in to repost.' };
    }
    
    const originalPostRef = doc(db, 'feedPosts', originalPostId);
    const newPostRef = doc(collection(db, 'feedPosts'));

    try {
        await runTransaction(db, async (transaction) => {
            const originalPostDoc = await transaction.get(originalPostRef);
            if (!originalPostDoc.exists()) {
                throw new Error("Original post not found.");
            }

            const originalPostData = originalPostDoc.data() as ThreadPost;
            
            if (originalPostData.type === 'repost') {
                throw new Error("You cannot repost a repost.");
            }

            const newPostData: Omit<ThreadPost, 'id'> = {
                author: user,
                content: '', 
                timestamp: serverTimestamp(),
                type: 'repost',
                commentsCount: 0,
                reactionsCount: 0,
                repostCount: 0,
                originalPost: {
                    id: originalPostDoc.id,
                    author: originalPostData.author,
                    content: originalPostData.content,
                    timestamp: originalPostData.timestamp,
                    storyId: originalPostData.storyId,
                    storyTitle: originalPostData.storyTitle,
                    storyCoverUrl: originalPostData.storyCoverUrl,
                    imageUrl: originalPostData.imageUrl,
                    songUrl: originalPostData.songUrl,
                },
            };

            transaction.set(newPostRef, newPostData);
            transaction.update(originalPostRef, { repostCount: increment(1) });
        });
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error reposting:', error);
        if (error.code === 'permission-denied') {
            return { success: false, error: 'Permission denied to repost.' };
        }
        return { success: false, error: error.message || 'Could not repost.' };
    }
}
