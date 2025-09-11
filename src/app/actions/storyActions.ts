
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Story } from '@/types';

export async function toggleChapterVote(
  storyId: string,
  chapterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated.' };
  }

  const storyRef = doc(db, 'stories', storyId);

  try {
    const storySnap = await getDoc(storyRef);
    if (!storySnap.exists()) {
      return { success: false, error: 'Story not found.' };
    }

    const storyData = storySnap.data() as Story;
    const chapterIndex = storyData.chapters.findIndex(c => c.id === chapterId);

    if (chapterIndex === -1) {
      return { success: false, error: 'Chapter not found.' };
    }

    const chapter = storyData.chapters[chapterIndex];
    const voterIds = chapter.voterIds || [];
    const hasVoted = voterIds.includes(userId);

    if (hasVoted) {
      // Unvote
      storyData.chapters[chapterIndex].voterIds = voterIds.filter(id => id !== userId);
      storyData.chapters[chapterIndex].votes = Math.max(0, (chapter.votes || 0) - 1);
    } else {
      // Vote
      storyData.chapters[chapterIndex].voterIds = [...voterIds, userId];
      storyData.chapters[chapterIndex].votes = (chapter.votes || 0) + 1;
    }
    
    await updateDoc(storyRef, { chapters: storyData.chapters });

    // Revalidate the path to update the UI for other users.
    revalidatePath(`/stories/${storyId}/read/${chapterId}`);
    revalidatePath(`/stories/${storyId}`);

    return { success: true };
  } catch (error) {
    console.error('Error toggling chapter vote:', error);
    return {
      success: false,
      error: 'Could not update vote status. Please try again.',
    };
  }
}
