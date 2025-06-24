'use server';

import { db } from '@/lib/firebase';
import { UserSummary, Question } from '@/types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Action for a reader to ask a question
export async function askQuestion(
  authorId: string,
  questionText: string,
  asker: UserSummary,
  isPublic: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!asker || !asker.id) {
    return { success: false, error: 'You must be logged in to ask a question.' };
  }
  if (!authorId) {
    return { success: false, error: 'Author not specified.' };
  }
  if (questionText.trim().length < 10) {
    return { success: false, error: 'Question must be at least 10 characters long.' };
  }
  if (questionText.trim().length > 500) {
    return { success: false, error: 'Question cannot exceed 500 characters.' };
  }

  const newQuestion: Omit<Question, 'id'> = {
    asker,
    authorId,
    questionText: questionText.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    isPublic,
  };

  try {
    await addDoc(collection(db, 'questions'), newQuestion);
    revalidatePath(`/profile/${authorId}`);
    return { success: true };
  } catch (error) {
    console.error('Error asking question:', error);
    return { success: false, error: 'Could not submit your question. Please try again.' };
  }
}

// Action for an author to answer a question
export async function answerQuestion(
  questionId: string,
  answerText: string
): Promise<{ success: boolean; error?: string }> {
  if (!questionId) {
    return { success: false, error: 'Question ID is missing.' };
  }
  if (answerText.trim().length < 10) {
    return { success: false, error: 'Answer must be at least 10 characters long.' };
  }
   if (answerText.trim().length > 2000) {
    return { success: false, error: 'Answer cannot exceed 2000 characters.' };
  }

  const questionRef = doc(db, 'questions', questionId);

  try {
    const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) {
      return { success: false, error: 'Question not found.' };
    }

    await updateDoc(questionRef, {
      answerText: answerText.trim(),
      status: 'answered',
      answeredAt: serverTimestamp(),
    });
    revalidatePath(`/profile/${questionSnap.data().authorId}`);
    return { success: true };
  } catch (error) {
    console.error('Error answering question:', error);
    return { success: false, error: 'Could not submit your answer. Please try again.' };
  }
}

// Action for an author to decline a question
export async function declineQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!questionId) {
    return { success: false, error: 'Question ID is missing.' };
  }
  
  const questionRef = doc(db, 'questions', questionId);

  try {
     const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) {
      return { success: false, error: 'Question not found.' };
    }
    await updateDoc(questionRef, {
      status: 'declined',
      answeredAt: serverTimestamp(),
    });
    revalidatePath(`/profile/${questionSnap.data().authorId}`);
    return { success: true };
  } catch (error) {
    console.error('Error declining question:', error);
    return { success: false, error: 'Could not decline the question. Please try again.' };
  }
}
