'use server';
/**
 * @fileOverview Server actions for creating and managing ephemeral user stories.
 */
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { UserStory, UserSummary } from '@/types';

// Helper to determine media type from a Data URI
function getMediaType(dataUri: string): 'image' | 'video' {
    const mimeType = dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));
    if (mimeType.startsWith('video/')) {
        return 'video';
    }
    return 'image';
}

// This function uploads a file (as a data URI) to Cloudinary and returns the secure URL.
async function uploadToCloudinary(dataUri: string): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary environment variables are not set.');
    }

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', uploadPreset);
    
    const resourceType = getMediaType(dataUri);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            console.error("Cloudinary upload error response:", data);
            throw new Error(data.error?.message || 'Unknown Cloudinary error');
        }
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Could not upload media file.');
    }
}

/**
 * Creates a new ephemeral story in Firestore.
 * @param mediaDataUri The image or video file to be posted, encoded as a Data URI.
 * @param author The UserSummary object of the user posting the story.
 * @returns An object indicating success or failure.
 */
export async function createUserStory(mediaDataUri: string, author: UserSummary): Promise<{ success: boolean; error?: string }> {
    if (!author || !author.id) {
        return { success: false, error: 'User is not authenticated.' };
    }

    try {
        const mediaUrl = await uploadToCloudinary(mediaDataUri);
        const mediaType = getMediaType(mediaDataUri);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        const newStoryData: Omit<UserStory, 'id'> = {
            userId: author.id,
            username: author.displayName || author.username,
            userAvatarUrl: author.avatarUrl || '',
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            viewedBy: [],
        };
        
        await addDoc(collection(db, 'userStories'), newStoryData);

        return { success: true };
    } catch (error: any) {
        console.error('Error creating user story:', error.message);
        return { success: false, error: 'An error occurred while posting the story.' };
    }
}
