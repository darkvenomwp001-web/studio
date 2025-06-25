'use server';

import { db } from '@/lib/firebase';
import { UserSummary, Question } from '@/types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Simplified action for a user to ask a question
export async function askQuestion(
  asker: UserSummary,
  questionText: string,
): Promise<{ success: boolean; error?: string }> {
  if (!asker || !asker.id) {
    return { success: false, error: 'You must be logged in to ask a question.' };
  }
  if (questionText.trim().length < 10) {
    return { success: false, error: 'Question must be at least 10 characters long.' };
  }
  if (questionText.trim().length > 1000) {
    return { success: false, error: 'Question cannot exceed 1000 characters.' };
  }

  const sanitizedAsker: UserSummary = {
    id: asker.id,
    username: asker.username,
    displayName: asker.displayName || asker.username,
    avatarUrl: asker.avatarUrl || '',
  };

  const newQuestion: Omit<Question, 'id' | 'answerText' | 'answeredAt' | 'answerer'> = {
    asker: sanitizedAsker,
    questionText: questionText.trim(),
    status: 'unanswered',
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, 'questions'), newQuestion);
    revalidatePath('/'); // Revalidate the homepage to show the new question
    return { success: true };
  } catch (error) {
    console.error('Error asking question:', error);
    return { success: false, error: 'Could not submit your question. Please try again.' };
  }
}
