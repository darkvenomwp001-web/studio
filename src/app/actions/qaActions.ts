
'use server';

import { db } from '@/lib/firebase';
import { UserSummary, Question } from '@/types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Action for a user to ask a question in the public feed
export async function askQuestion(
  asker: UserSummary,
  questionText: string,
  targetAuthor?: UserSummary,
  attachedChapter?: { storyId: string, storyTitle: string, chapterId: string, chapterTitle: string } | null
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

  // Sanitize UserSummary objects to ensure all keys are present for security rules
  const sanitizedAsker: UserSummary = {
    id: asker.id,
    username: asker.username,
    displayName: asker.displayName || asker.username,
    avatarUrl: asker.avatarUrl || '',
  };

  const newQuestion: Omit<Question, 'id'> = {
    asker: sanitizedAsker, // Use sanitized object
    questionText: questionText.trim(),
    status: 'unanswered',
    createdAt: serverTimestamp(),
  };

  if (targetAuthor) {
    const sanitizedTargetAuthor: UserSummary = {
      id: targetAuthor.id,
      username: targetAuthor.username,
      displayName: targetAuthor.displayName || targetAuthor.username,
      avatarUrl: targetAuthor.avatarUrl || '',
    };
    newQuestion.targetAuthor = sanitizedTargetAuthor; // Use sanitized object
  }
  
  if (attachedChapter) {
    newQuestion.attachedChapter = attachedChapter;
  }

  try {
    await addDoc(collection(db, 'questions'), newQuestion);
    revalidatePath('/');
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
    revalidatePath('/');
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
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error declining question:', error);
    return { success: false, error: 'Could not decline the question. Please try again.' };
  }
}

// Action for the original poster to edit their question
export async function editQuestion(
  questionId: string,
  newText: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  const questionRef = doc(db, 'questions', questionId);
  try {
    const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) {
      return { success: false, error: "Question not found." };
    }
    if (questionSnap.data().asker.id !== currentUserId) {
      return { success: false, error: "You can only edit your own questions." };
    }

    await updateDoc(questionRef, {
      questionText: newText,
      isEdited: true,
      createdAt: serverTimestamp(), // Update timestamp to show it's recent
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error editing question:", error);
    return { success: false, error: "Failed to edit question." };
  }
}

// Action for the original poster to delete their question
export async function deleteQuestion(
  questionId: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  const questionRef = doc(db, 'questions', questionId);
  try {
    const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) {
      return { success: true, error: "Question already deleted." }; // It's gone, so success.
    }
    if (questionSnap.data().asker.id !== currentUserId) {
      return { success: false, error: "You can only delete your own questions." };
    }
    await deleteDoc(questionRef);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, error: "Failed to delete question." };
  }
}

// Action for a mentioned author to delete/report a question
export async function deleteQuestionByAuthor(
  questionId: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
   const questionRef = doc(db, 'questions', questionId);
  try {
    const questionSnap = await getDoc(questionRef);
    if (!questionSnap.exists()) {
      return { success: true, error: "Question already deleted." };
    }
    if (questionSnap.data().targetAuthor?.id !== currentUserId) {
      return { success: false, error: "You can only delete questions directed at you." };
    }
    await deleteDoc(questionRef);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, error: "Failed to delete question." };
  }
}
