
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc, // Make sure deleteDoc is imported
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

// Helper function for robust ownership check
function isPostOwner(userId: string, postData: { [key: string]: any }): boolean {
  if (!userId || !postData) return false;
  // Check for authorId at the top level
  if (postData.authorId === userId) return true;
  // Check for author object with an id property
  if (postData.author && typeof postData.author === 'object' && postData.author.id === userId) return true;
  // Check for user object with an id property (like in comments)
  if (postData.user && typeof postData.user === 'object' && postData.user.id === userId) return true;
  // Check for authorInfo object with an id property (for status updates)
  if (postData.authorInfo && typeof postData.authorInfo === 'object' && postData.authorInfo.id === userId) return true;
  return false;
}

export async function createLiveFeedPost(
  author: UserSummary,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (!author) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Post content cannot be empty.' };
  }
  if (content.trim().length > 500) {
    return { success: false, error: 'Post cannot exceed 500 characters.' };
  }

  try {
    await addDoc(collection(db, 'liveFeed'), {
      author,
      authorId: author.id,
      content,
      timestamp: serverTimestamp(),
      isArchived: false,
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating live feed post:', error);
    return { success: false, error: 'Could not create post. Please try again.' };
  }
}

export async function updateLiveFeedPost(
  postId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (content.trim().length === 0) {
    return { success: false, error: 'Post content cannot be empty.' };
  }
  if (content.trim().length > 500) {
    return { success: false, error: 'Post cannot exceed 500 characters.' };
  }
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const postRef = doc(db, 'liveFeed', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found.' };
    }
    
    if (!isPostOwner(userId, postSnap.data())) {
        return { success: false, error: 'You do not have permission to edit this post.' };
    }

    await updateDoc(postRef, {
      content: content.trim(),
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating live feed post:', error);
    return { success: false, error: 'Could not update post.' };
  }
}

export async function archiveLiveFeedPost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  try {
    const postRef = doc(db, 'liveFeed', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found.' };
    }
    
    if (!isPostOwner(userId, postSnap.data())) {
        return { success: false, error: 'You do not have permission to archive this post.' };
    }

    await updateDoc(postRef, {
        isArchived: true,
        archivedAt: serverTimestamp()
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error archiving live feed post:', error);
    return { success: false, error: 'Could not archive post.' };
  }
}

export async function permanentlyDeleteLiveFeedPost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    try {
        const postRef = doc(db, 'liveFeed', postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            return { success: true, error: 'Post already deleted.' };
        }
        
        if (!isPostOwner(userId, postSnap.data())) {
            return { success: false, error: 'You do not have permission to delete this post.' };
        }

        await deleteDoc(postRef);
        revalidatePath('/settings/archive');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting live feed post:', error);
        return { success: false, error: 'Could not permanently delete post.' };
    }
}
