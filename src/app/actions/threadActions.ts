'use server';

import { db } from '@/lib/firebase-server';
import {
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  getDocs
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Archive or Unarchive a thread for the specific user.
 */
export async function toggleArchiveThread(threadId: string, userId: string, archive: boolean) {
    if (!userId) return { success: false, error: 'Auth required' };
    const ref = doc(db, 'conversations', threadId);
    try {
        await updateDoc(ref, {
            archivedBy: archive ? arrayUnion(userId) : arrayRemove(userId)
        });
        revalidatePath('/notifications');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Ignore or Unignore a thread for the specific user.
 */
export async function toggleIgnoreThread(threadId: string, userId: string, ignore: boolean) {
    if (!userId) return { success: false, error: 'Auth required' };
    const ref = doc(db, 'conversations', threadId);
    try {
        await updateDoc(ref, {
            ignoredBy: ignore ? arrayUnion(userId) : arrayRemove(userId)
        });
        revalidatePath('/notifications');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Pin or Unpin a thread for the specific user.
 */
export async function togglePinThread(threadId: string, userId: string, pin: boolean) {
    if (!userId) return { success: false, error: 'Auth required' };
    const ref = doc(db, 'conversations', threadId);
    try {
        await updateDoc(ref, {
            pinnedBy: pin ? arrayUnion(userId) : arrayRemove(userId)
        });
        revalidatePath('/notifications');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Update nickname for a participant in a thread.
 */
export async function setThreadNickname(threadId: string, targetUserId: string, nickname: string) {
    const ref = doc(db, 'conversations', threadId);
    try {
        await updateDoc(ref, {
            [`nicknames.${targetUserId}`]: nickname
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Delete a message for a specific user only.
 */
export async function deleteMessageForMe(threadId: string, messageId: string, userId: string) {
    const ref = doc(db, 'conversations', threadId, 'messages', messageId);
    try {
        await updateDoc(ref, {
            deletedFor: arrayUnion(userId)
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Delete a message for everyone (unsend).
 */
export async function unsendMessage(threadId: string, messageId: string, userId: string) {
    const ref = doc(db, 'conversations', threadId, 'messages', messageId);
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false, error: 'Not found' };
        if (snap.data().senderId !== userId) return { success: false, error: 'Unauthorized' };
        
        await updateDoc(ref, {
            content: 'Message unsent',
            type: 'text',
            mediaUrl: null,
            isUnsent: true
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Edit a sent message.
 */
export async function editSentMessage(threadId: string, messageId: string, userId: string, newContent: string) {
    const ref = doc(db, 'conversations', threadId, 'messages', messageId);
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false, error: 'Not found' };
        if (snap.data().senderId !== userId) return { success: false, error: 'Unauthorized' };
        
        await updateDoc(ref, {
            content: newContent,
            isEdited: true,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}