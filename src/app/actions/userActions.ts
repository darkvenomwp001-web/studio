
'use server';

import { db } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs, deleteDoc, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Achievement, User, UserSummary } from '@/types';
import { addNotification } from './notificationActions';

const OWNER_USERNAMES = ['authorrafaelnv', 'd4rkv3nom'];

const XP_AMOUNTS = {
  vote: 10,
  comment: 25,
  first_story: 100,
};

const ACHIEVEMENTS = {
  FIRST_VOTE: {
    id: 'first_vote',
    name: 'First Vote!',
    description: 'You cast your first vote on a chapter.',
  },
  FIRST_COMMENT: {
    id: 'first_comment',
    name: 'Voice in the Crowd',
    description: 'You posted your first comment.',
  },
};

export async function awardXP(userId: string, action: keyof typeof XP_AMOUNTS): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  const xpToAward = XP_AMOUNTS[action];
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data();
    const hasFirstVoteAchievement = userData.achievements?.some((ach: Achievement) => ach.id === 'first_vote');
    if (action === 'vote' && !hasFirstVoteAchievement) {
      await unlockAchievement(userId, 'FIRST_VOTE');
    }
    await updateDoc(userRef, { xp: increment(xpToAward) });
  } catch (error) {
    console.error(error);
  }
}

export async function unlockAchievement(userId: string, achievementKey: keyof typeof ACHIEVEMENTS): Promise<void> {
    if (!userId) return;
    const achievement = ACHIEVEMENTS[achievementKey];
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            achievements: arrayUnion({
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                unlockedAt: new Date().toISOString(),
            })
        });
        await addNotification({
            userId,
            type: 'achievement_unlocked',
            message: `Achievement Unlocked: ${achievement.name}!`,
            link: `/profile/${userId}`,
            actor: { id: 'system', username: 'System', displayName: 'D4RKV3NOM' }
        });
    } catch (error) {
        console.error(error);
    }
}

export async function updateUserRole(adminId: string, targetUserId: string, newRole: 'reader' | 'writer' | 'moderator'): Promise<{ success: boolean; error?: string }> {
    try {
        const adminUserDoc = await getDoc(doc(db, 'users', adminId));
        if (!adminUserDoc.exists() || !OWNER_USERNAMES.includes(adminUserDoc.data().username)) {
            return { success: false, error: 'Unauthorized operation.' };
        }
        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, { role: newRole });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Could not update role.' };
    }
}

export async function toggleUserVerifiedStatus(adminId: string, targetUserId: string, newStatus: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const adminUserDoc = await getDoc(doc(db, 'users', adminId));
        if (!adminUserDoc.exists() || !OWNER_USERNAMES.includes(adminUserDoc.data().username)) {
            return { success: false, error: 'Unauthorized operation.' };
        }
        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, { isVerified: newStatus });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Could not update verification.' };
    }
}

export async function banUser(adminId: string, targetUserId: string, banStatus: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const adminUserDoc = await getDoc(doc(db, 'users', adminId));
        if (!adminUserDoc.exists() || !OWNER_USERNAMES.includes(adminUserDoc.data().username)) {
            return { success: false, error: 'Unauthorized operation.' };
        }
        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, { isBanned: banStatus });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Could not toggle ban.' };
    }
}

export async function deleteUserPermanently(adminId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserDoc = await getDoc(doc(db, 'users', adminId));
    if (!adminUserDoc.exists() || !OWNER_USERNAMES.includes(adminUserDoc.data().username)) {
        return { success: false, error: 'Unauthorized operation.' };
    }
    const targetUserRef = doc(db, 'users', targetUserId);
    await deleteDoc(targetUserRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Could not delete user.' };
  }
}

export async function toggleCloseFriend(currentUserId: string, friendId: string, isAdding: boolean): Promise<{ success: boolean, error?: string }> {
  const userRef = doc(db, 'users', currentUserId);
  try {
    if (isAdding) {
      await updateDoc(userRef, { closeFriendIds: arrayUnion(friendId) });
    } else {
      await updateDoc(userRef, { closeFriendIds: arrayRemove(friendId) });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Update failed.' };
  }
}

export async function askQuestion(asker: User, authorId: string, questionText: string): Promise<{ success: boolean, error?: string }> {
    try {
        await addDoc(collection(db, 'questions'), {
            asker: { id: asker.id, username: asker.username, displayName: asker.displayName, avatarUrl: asker.avatarUrl },
            authorId,
            questionText,
            status: 'unanswered',
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to send.' };
    }
}

export async function answerQuestion(answerer: User, questionId: string, answerText: string): Promise<{ success: boolean, error?: string }> {
    try {
        const questionRef = doc(db, 'questions', questionId);
        await updateDoc(questionRef, {
            status: 'answered',
            answerText,
            answerer: { id: answerer.id, username: answerer.username, displayName: answerer.displayName, avatarUrl: answerer.avatarUrl },
            answeredAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to answer.' };
    }
}

export async function createPoll(authorId: string, question: string, options: string[]): Promise<{ success: boolean, error?: string }> {
    try {
        await addDoc(collection(db, 'polls'), {
            authorId,
            question,
            options: options.map((opt, i) => ({ id: `opt${i}`, text: opt, votes: [] })),
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to create poll.' };
    }
}

export async function voteOnPoll(pollId: string, optionId: string, userId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const pollRef = doc(db, 'polls', pollId);
        const pollSnap = await getDoc(pollRef);
        if (!pollSnap.exists()) return { success: false, error: 'Poll not found.' };
        const pollData = pollSnap.data();
        const hasVoted = pollData.options.some((opt: any) => opt.votes.includes(userId));
        if (hasVoted) return { success: false, error: 'Already voted.' };
        const updatedOptions = pollData.options.map((opt: any) => {
            if (opt.id === optionId) return { ...opt, votes: [...opt.votes, userId] };
            return opt;
        });
        await updateDoc(pollRef, { options: updatedOptions });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Vote failed.' };
    }
}
