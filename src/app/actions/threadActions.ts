
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
  writeBatch,
} from 'firebase/firestore';
import type { UserSummary, ThreadPost, ReactionType } from '@/types';
import { revalidatePath } from 'next/cache';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const postCollectionRef = collection(db, 'feedPosts');
  const finalPostData = {
      ...postData,
      reactionsCount: 0,
      commentsCount: 0,
      isPinned: false,
      timestamp: serverTimestamp()
  };

  addDoc(postCollectionRef, finalPostData)
    .then(() => {
        revalidatePath('/');
    })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: postCollectionRef.path,
        operation: 'create',
        requestResourceData: finalPostData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

  return { success: true };
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

  updateDoc(postRef, updateData)
    .then(() => {
        revalidatePath('/');
        revalidatePath(`/threads/edit/${postId}`);
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: postRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
  return { success: true };
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

    if (postSnap.data().author.id !== userId) {
      return { success: false, error: 'You do not have permission to delete this post.' };
    }

    await deleteDoc(postRef);
    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error("Error deleting post:", error);
    if ((error as any).code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: postRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
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

    runTransaction(db, async (transaction) => {
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
    }).then(() => {
        revalidatePath('/');
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: reactionRef.path,
            operation: 'write',
            requestResourceData: { type: reactionType },
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return { success: true };
}


export async function pinThreadPost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    const postRef = doc(db, 'feedPosts', postId);
    
    // We get the post first to toggle the pin status, but let the update itself be handled by rules.
    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            return { success: false, error: 'Post not found.' };
        }
        
        const currentPinStatus = postSnap.data().isPinned || false;
        
        updateDoc(postRef, { isPinned: !currentPinStatus })
            .then(() => {
                revalidatePath('/');
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: postRef.path,
                    operation: 'update',
                    requestResourceData: { isPinned: !currentPinStatus },
                });
                errorEmitter.emit('permission-error', permissionError);
            });
            
    } catch (e) {
         return { success: false, error: 'Could not read post to pin.' };
    }
    
    return { success: true };
}


export async function repostThreadPost(originalPostId: string, user: UserSummary): Promise<{ success: boolean, error?: string }> {
    if (!user || !user.id) {
        return { success: false, error: 'You must be signed in to repost.' };
    }
    
    const originalPostRef = doc(db, 'feedPosts', originalPostId);
    const newPostRef = doc(collection(db, 'feedPosts'));

    runTransaction(db, async (transaction) => {
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
    })
    .then(() => {
        revalidatePath('/');
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: originalPostRef.path,
          operation: 'write',
          requestResourceData: { note: `Repost action by ${user.id}` },
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return { success: true };
}
