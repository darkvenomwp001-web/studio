
'use server';

import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


export async function deleteStatusUpdate(
  statusId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  try {
    const statusRef = doc(db, 'statusUpdates', statusId);
    const statusSnap = await getDoc(statusRef);

    if (!statusSnap.exists()) {
      // It was already deleted, which is a success from the user's perspective
      return { success: true };
    }

    const statusData = statusSnap.data();

    // Forensic ownership check to handle all possible data structures
    let postAuthorId: string | undefined = undefined;
    if (statusData.authorId) { // Check for top-level `authorId`
        postAuthorId = statusData.authorId;
    } else if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && 'id' in statusData.authorInfo) { // Check for `authorInfo.id`
        postAuthorId = (statusData.authorInfo as {id: string}).id;
    } else if (statusData.author && typeof statusData.author === 'object' && 'id' in statusData.author) { // Check for `author.id` (legacy)
        postAuthorId = (statusData.author as {id: string}).id;
    }


    if (!postAuthorId || postAuthorId !== userId) {
      console.error(`Permission denied: User ${userId} tried to delete status ${statusId} owned by ${postAuthorId}. Data:`, statusData);
      return { success: false, error: 'You do not have permission to delete this status.' };
    }
    
    // Delete from Cloudinary if mediaUrl exists
    if (statusData.mediaUrl) {
      try {
        const publicIdMatch = statusData.mediaUrl.match(/\/v\d+\/(.+?)(?:\.[\w]+)?$/);
        if (publicIdMatch && publicIdMatch[1]) {
            const publicId = publicIdMatch[1];
            await cloudinary.uploader.destroy(publicId);
        } else {
            console.warn(`Could not extract public_id from URL: ${statusData.mediaUrl}`);
        }
      } catch (cloudinaryError: any) {
        console.error("Cloudinary deletion failed:", cloudinaryError);
        // Don't block Firestore deletion if Cloudinary fails, but log the error.
        // In a real production app, you might want a retry queue.
        return { success: false, error: `Could not delete the image from storage: ${cloudinaryError.message}. The post was not deleted.` };
      }
    }


    await deleteDoc(statusRef);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting status update:', error);
    return { success: false, error: 'Could not delete status.' };
  }
}
