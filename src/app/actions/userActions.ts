
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs, deleteDoc, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Achievement, User, UserSummary } from '@/types';
import { addNotification } from './notificationActions';

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

/**
 * Awards XP to a user and checks for level ups.
 * @param userId The ID of the user to award XP to.
 * @param action The action that triggered the XP award.
 */
export async function awardXP(userId: string, action: keyof typeof XP_AMOUNTS): Promise<void> {
  if (!userId) return;

  const userRef = doc(db, 'users', userId);
  const xpToAward = XP_AMOUNTS[action];

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.error(`User with ID ${userId} not found for awarding XP.`);
      return;
    }
    const userData = userSnap.data();

    // Check for "First Vote" achievement
    const hasFirstVoteAchievement = userData.achievements?.some((ach: Achievement) => ach.id === 'first_vote');
    
    if (action === 'vote' && !hasFirstVoteAchievement) {
      await unlockAchievement(userId, 'FIRST_VOTE');
    }

    // Update XP and check for level up
    await updateDoc(userRef, {
      xp: increment(xpToAward)
    });
    
  } catch (error) {
    console.error(`Failed to award XP to user ${userId} for action ${action}:`, error);
  }
}


/**
 * Unlocks a new achievement for a user.
 * @param userId The ID of the user.
 * @param achievementKey The key of the achievement to unlock from the ACHIEVEMENTS constant.
 */
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

        // Use the centralized notification action
        await addNotification({
            userId,
            type: 'achievement_unlocked',
            message: `Achievement Unlocked: ${achievement.name}!`,
            link: `/profile/${userId}`, // Link to their own profile to see the achievement
            actor: { id: 'system', username: 'System', displayName: 'D4RKV3NOM' }
        });
        
    } catch (error) {
        console.error(`Failed to unlock achievement ${achievement.id} for user ${userId}:`, error);
    }
}


export async function updateUserRole(adminId: string, targetUserId: string, newRole: 'reader' | 'writer' | 'moderator'): Promise<{ success: boolean; error?: string }> {
    try {
        const adminUserDoc = await getDoc(doc(db, 'users', adminId));
        if (!adminUserDoc.exists() || adminUserDoc.data().username !== 'authorrafaelnv') {
            return { success: false, error: 'Unauthorized operation. You are not an administrator.' };
        }
        
        if (!['reader', 'writer', 'moderator'].includes(newRole)) {
             return { success: false, error: 'Invalid role specified.' };
        }

        if (!targetUserId) {
            return { success: false, error: 'Target user ID is required.' };
        }
        
        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, { role: newRole });
        return { success: true };

    } catch (error) {
        console.error('Error updating user role:', error);
        return { success: false, error: 'Could not update user role.' };
    }
}

export async function banUser(adminId: string, targetUserId: string, banStatus: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const adminUserDoc = await getDoc(doc(db, 'users', adminId));
        if (!adminUserDoc.exists() || adminUserDoc.data().username !== 'authorrafaelnv') {
            return { success: false, error: 'Unauthorized operation.' };
        }
        if (!targetUserId) {
            return { success: false, error: 'Target user ID is required.' };
        }
        if (targetUserId === adminId) {
            return { success: false, error: 'The main admin account cannot be banned.' };
        }

        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, { isBanned: banStatus });
        return { success: true };
    } catch (error) {
        console.error(`Error ${banStatus ? 'banning' : 'unbanning'} user:`, error);
        return { success: false, error: `Could not ${banStatus ? 'ban' : 'unban'} user.` };
    }
}


export async function deleteUserPermanently(adminId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserDoc = await getDoc(doc(db, 'users', adminId));
    if (!adminUserDoc.exists() || adminUserDoc.data().username !== 'authorrafaelnv') {
        return { success: false, error: 'Unauthorized operation.' };
    }
    
    if (!targetUserId) {
      return { success: false, error: 'Target user ID is required.' };
    }
    
    // You cannot delete the main admin account
    if (targetUserId === adminId) {
        return { success: false, error: 'The main admin account cannot be deleted.' };
    }

    const targetUserRef = doc(db, 'users', targetUserId);
    await deleteDoc(targetUserRef);
    
    // Here you would also add logic to delete the user from Firebase Auth
    // and clean up their content (stories, comments, etc.). 
    // This part is complex and should be handled with care in a real app.
    // For now, we just delete the Firestore user document.

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Could not delete user.' };
  }
}

export async function toggleCloseFriend(currentUserId: string, friendId: string, isAdding: boolean): Promise<{ success: boolean, error?: string }> {
  if (!currentUserId || !friendId) {
    return { success: false, error: 'User information is missing.' };
  }

  const userRef = doc(db, 'users', currentUserId);

  try {
    if (isAdding) {
      await updateDoc(userRef, {
        closeFriendIds: arrayUnion(friendId)
      });
    } else {
      await updateDoc(userRef, {
        closeFriendIds: arrayRemove(friendId)
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating close friends list:', error);
    return { success: false, error: 'Could not update your Close Friends list.' };
  }
}

export async function askQuestion(asker: User, authorId: string, questionText: string): Promise<{ success: boolean, error?: string }> {
    if (!asker || !authorId || !questionText) {
        return { success: false, error: 'Missing required information.' };
    }
    try {
        await addDoc(collection(db, 'questions'), {
            asker: {
                id: asker.id,
                username: asker.username,
                displayName: asker.displayName,
                avatarUrl: asker.avatarUrl,
            },
            authorId,
            questionText,
            status: 'unanswered',
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error asking question:", error);
        return { success: false, error: 'Could not send question.' };
    }
}

export async function answerQuestion(answerer: User, questionId: string, answerText: string): Promise<{ success: boolean, error?: string }> {
    if (!answerer || !questionId || !answerText) {
        return { success: false, error: 'Missing required information.' };
    }
    try {
        const questionRef = doc(db, 'questions', questionId);
        await updateDoc(questionRef, {
            status: 'answered',
            answerText,
            answerer: {
                id: answerer.id,
                username: answerer.username,
                displayName: answerer.displayName,
                avatarUrl: answerer.avatarUrl,
            },
            answeredAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error answering question:", error);
        return { success: false, error: 'Could not publish answer.' };
    }
}

export async function createPoll(authorId: string, question: string, options: string[]): Promise<{ success: boolean, error?: string }> {
    if (!authorId || !question || options.length < 2) {
        return { success: false, error: 'Missing required information for poll.' };
    }
    try {
        await addDoc(collection(db, 'polls'), {
            authorId,
            question,
            options: options.map((opt, i) => ({ id: `opt${i}`, text: opt, votes: [] })),
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating poll:", error);
        return { success: false, error: 'Could not create poll.' };
    }
}

export async function voteOnPoll(pollId: string, optionId: string, userId: string): Promise<{ success: boolean, error?: string }> {
    if (!pollId || !optionId || !userId) {
        return { success: false, error: 'Missing required information.' };
    }
    try {
        const pollRef = doc(db, 'polls', pollId);
        const pollSnap = await getDoc(pollRef);
        if (!pollSnap.exists()) {
            return { success: false, error: 'Poll not found.' };
        }
        const pollData = pollSnap.data();
        const hasVoted = pollData.options.some((opt: any) => opt.votes.includes(userId));
        if (hasVoted) {
            return { success: false, error: 'You have already voted in this poll.' };
        }
        const updatedOptions = pollData.options.map((opt: any) => {
            if (opt.id === optionId) {
                return { ...opt, votes: [...opt.votes, userId] };
            }
            return opt;
        });
        await updateDoc(pollRef, { options: updatedOptions });
        return { success: true };
    } catch (error) {
        console.error("Error voting on poll:", error);
        return { success: false, error: 'Could not cast vote.' };
    }
}
