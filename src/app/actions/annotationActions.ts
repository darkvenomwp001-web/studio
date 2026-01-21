'use server';

import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface CreateAnnotationData {
    userId: string;
    storyId: string;
    chapterId: string;
    storyTitle: string;
    chapterTitle: string;
    highlightedText: string;
    highlightColor: string;
    note?: string;
}

export async function createAnnotation(data: CreateAnnotationData): Promise<{ success: boolean; error?: string }> {
    if (!data.userId) {
        return { success: false, error: 'User is not authenticated.' };
    }
    if (!data.highlightedText) {
        return { success: false, error: 'Highlighted text cannot be empty.' };
    }

    try {
        await addDoc(collection(db, 'annotations'), {
            ...data,
            timestamp: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error creating annotation:', error);
        return { success: false, error: 'Could not save annotation.' };
    }
}
