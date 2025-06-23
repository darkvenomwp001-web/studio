import type { Timestamp } from 'firebase/firestore';

// NOTE: This type definition file has been updated based on a new data model schema.
// This may cause compilation errors in components that still use old type definitions.

/**
 * Represents a user in the system. Corresponds to the `User` table.
 * Fields are based on the provided schema.
 */
export interface User {
  id: string; // Document ID from Firestore (auth UID)
  username: string;
  email?: string;
  bio?: string;
  profilePicture?: string;
  createdAt: Timestamp;
}

/**
 * A summary of a user for embedding in other documents to denormalize data,
 * which is a common practice in Firestore.
 */
export interface UserSummary {
  id: string;
  username: string;
  profilePicture?: string;
  displayName?: string; // Kept for compatibility, should be populated with username
}

/**
 * Represents a main literary work. Corresponds to the `Story` table.
 */
export interface Story {
  id:string;
  // The schema has `author: User!`. In Firestore, we store a summary.
  author: UserSummary;
  title: string;
  description: string;
  genre: string;
  createdAt: Timestamp;
  coverImage?: string;
  tags?: string[];
  // Chapters can be a sub-collection or a nested array.
  chapters?: Chapter[];
}

/**
 * Represents a chapter within a Story. Corresponds to the `Chapter` table.
 */
export interface Chapter {
  id: string;
  // The schema has `story: Story!`. This is implied by chapters being nested in a Story document.
  title: string;
  content: string;
  chapterNumber: number;
  createdAt: Timestamp;
}

/**
 * Represents an ephemeral, Instagram-style story post. Corresponds to the `ShortStory` table.
 */
export interface ShortStory {
  id: string;
  // The schema has `author: User!`. In Firestore, we store a summary.
  author: UserSummary;
  createdAt: Timestamp;
  mediaType: 'image' | 'video' | 'text';
  mediaUrl?: string; // URL for image or video
  text?: string;     // Content for text-based stories
  expiration: Timestamp;
}

/**
 * Represents the relationship between two users. Corresponds to the `Follow` table.
 * The document ID would typically be `followerId_followingId`.
 */
export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

/**
 * Represents a comment on a Story or Chapter. Corresponds to the `Comment` table.
 */
export interface Comment {
  id: string;
  // The schema has `user: User!`, `story: Story!`, `chapter: Chapter`.
  // In Firestore, we store summaries or IDs.
  user: UserSummary;
  storyId: string;
  chapterId?: string;
  text: string;
  createdAt: Timestamp;
  parentId?: string | null; // Kept for threaded replies
}

/**
 * Represents a user-created list for organizing stories. Corresponds to the `ReadingList` table.
 */
export interface ReadingList {
  id: string;
  // The schema has `user: User!`. In Firestore, we store the user's ID.
  userId: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
}

/**
 * Represents a story's inclusion in a ReadingList. Corresponds to the `ReadingListEntry` table.
 * The document ID would typically be `readingListId_storyId`.
 */
export interface ReadingListEntry {
  readingListId: string;
  storyId: string;
  // Denormalized story info for easy display in a list.
  storySummary: {
    title: string;
    coverImage?: string;
    author: UserSummary;
  };
  position: number;
}
