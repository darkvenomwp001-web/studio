
'use server';

import { db } from '@/lib/firebase';
import { FeedPost, UserSummary } from '@/types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function createPost(
  authorSummary: UserSummary, 
  content: string,
  storyId?: string,
  storyTitle?: string,
  storyCoverUrl?: string
): Promise<{ success: boolean; error?: string }> {
  if (!authorSummary || !authorSummary.id) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Post content cannot be empty.' };
  }
  if (content.length > 1000) {
    return { success: false, error: 'Post content cannot exceed 1000 characters.' };
  }

  const authorForFirestore: UserSummary = {
    id: authorSummary.id,
    username: authorSummary.username,
  };
  if (authorSummary.displayName) {
    authorForFirestore.displayName = authorSummary.displayName;
  }
  if (authorSummary.avatarUrl) {
    authorForFirestore.avatarUrl = authorSummary.avatarUrl;
  }

  const newPost: Omit<FeedPost, 'id'> = {
    authorId: authorSummary.id,
    author: authorForFirestore,
    content: content.trim(),
    timestamp: serverTimestamp(),
    likesCount: 0,
    likedBy: [],
    commentsCount: 0,
  };

  if (storyId && storyTitle) {
    newPost.storyId = storyId;
    newPost.storyTitle = storyTitle;
    if (storyCoverUrl) {
      newPost.storyCoverUrl = storyCoverUrl;
    }
  }

  try {
    await addDoc(collection(db, 'feedPosts'), newPost);
    revalidatePath('/'); // Revalidate the homepage to show the new post
    return { success: true };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: 'Could not create the post. Please try again.' };
  }
}

export async function toggleLikePost(postId: string, userId: string): Promise<{ success: boolean, error?: string }> {
  if (!postId || !userId) {
    return { success: false, error: "Missing post or user ID." };
  }

  const postRef = doc(db, 'feedPosts', postId);
  
  try {
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
        return { success: false, error: "Post not found." };
    }

    const postData = postSnap.data() as FeedPost;
    const isLiked = postData.likedBy.includes(userId);

    if (isLiked) {
      // User is unliking the post
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId),
        likesCount: increment(-1),
      });
    } else {
      // User is liking the post
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId),
        likesCount: increment(1),
      });
    }
    revalidatePath('/'); // Revalidate to show updated like count/state
    return { success: true };
  } catch (error) {
    console.error("Error toggling like:", error);
    return { success: false, error: "An error occurred while updating the like." };
  }
}
