'use server';
/**
 * @fileOverview Server actions for interacting with the Storyly API.
 */
import { auth } from '@/lib/firebase';
import axios from 'axios';

// This function uploads a file (as a data URI) to Cloudinary and returns the secure URL.
// It's a necessary step because Storyly needs a public URL for the media.
async function uploadToCloudinary(dataUri: string): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary environment variables are not set.');
    }

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', uploadPreset);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error(data.error?.message || 'Unknown Cloudinary error');
        }
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Could not upload media file.');
    }
}

/**
 * Creates a new story in the user's Storyly account.
 * @param mediaDataUri The image or video file to be posted, encoded as a Data URI.
 * @returns An object indicating success or failure.
 */
export async function createStorylyStory(mediaDataUri: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return { success: false, error: 'User is not authenticated.' };
    }

    const apiKey = process.env.STORYLY_API_KEY;
    const accountId = process.env.STORYLY_ACCOUNT_ID;

    if (!apiKey || !accountId) {
        return { success: false, error: 'Storyly API credentials are not configured on the server.' };
    }

    try {
        // 1. Upload media to get a public URL
        const mediaUrl = await uploadToCloudinary(mediaDataUri);

        // 2. Prepare the payload for the Storyly API
        const storylyApiUrl = `https://api.storyly.io/api/v2/accounts/${accountId}/story-groups/${currentUser.uid}/stories`;
        
        const storyData = {
            stories: [{
                media: {
                    type: 'image', // Assuming image for now. Video detection can be added.
                    url: mediaUrl,
                },
                // You can add interactive elements here in the future
            }],
        };

        // 3. Make the API call to Storyly
        await axios.post(storylyApiUrl, storyData, {
            headers: {
                'x-storyly-auth': apiKey,
                'Content-Type': 'application/json',
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error creating Storyly story:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'An error occurred while posting the story.' };
    }
}
