
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs } from 'firebase/firestore';
import type { Achievement } from '@/types';
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


export async function updateUserRole(adminId: string, targetUserId: string, newRole: 'reader' | 'writer'): Promise<{ success: boolean; error?: string }> {
    try {
        // Find the admin user by username to get their actual ID
        const adminQuery = query(collection(db, 'users'), where('username', '==', 'authorrafaelnv'));
        const adminSnapshot = await getDocs(adminQuery);
        if (adminSnapshot.empty) {
            return { success: false, error: 'Admin account not found.' };
        }
        const realAdminId = adminSnapshot.docs[0].id;

        // Check if the person making the request is the real admin
        if (adminId !== realAdminId || !['reader', 'writer'].includes(newRole)) {
            return { success: false, error: 'Unauthorized operation.' };
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



