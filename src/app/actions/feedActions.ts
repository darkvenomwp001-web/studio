
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

export async function createPost(
  author: UserSummary,
  content: string,
  storyId?: string,
  storyTitle?: string,
  storyCoverUrl?: string,
  imageUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!author) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0 && !imageUrl) {
    return { success: false, error: 'Post content cannot be empty.' };
  }

  try {
    const postData: any = {
      author,
      authorId: author.id,
      content,
      timestamp: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
    };

    if (storyId && storyTitle) {
      postData.storyId = storyId;
      postData.storyTitle = storyTitle;
      postData.storyCoverUrl = storyCoverUrl || '';
    }

    if (imageUrl) {
        postData.imageUrl = imageUrl;
    }

    await addDoc(collection(db, 'feedPosts'), postData);
    revalidatePath('/'); // Revalidate the homepage feed
    return { success: true };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: 'Could not create post. Please try again.' };
  }
}

export async function toggleLikePost(
  postId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated.' };
  }

  try {
    const postRef = doc(db, 'feedPosts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found.' };
    }

    const postData = postSnap.data();
    const isLiked = postData.likedBy.includes(userId);

    if (isLiked) {
      // Unlike
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId),
        likesCount: postData.likesCount - 1,
      });
    } else {
      // Like
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId),
        likesCount: postData.likesCount + 1,
      });
    }

    revalidatePath('/'); // Revalidate to show updated like count
    return { success: true };
  } catch (error) {
    console.error('Error toggling like:', error);
    return {
      success: false,
      error: 'Could not update like status. Please try again.',
    };
  }
}
