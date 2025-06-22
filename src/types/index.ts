
import type { Timestamp } from 'firebase/firestore';

export interface AllowedUser {
  userId: string;
  username: string; // For display purposes
  expiresAt: Timestamp;
}

export interface Story {
  id: string;
  title: string;
  author: UserSummary;
  genre: string;
  coverImageUrl?: string;
  dataAiHint?: string;
  summary: string;
  tags: string[];
  chapters: Chapter[];
  rating?: number;
  views?: number;
  isMature?: boolean;
  status?: 'Ongoing' | 'Completed' | 'Draft' | 'Unlisted' | 'Private';
  lastUpdated: any; // Can be ISO String or Firestore Timestamp
  language?: string;
  visibility?: 'Public' | 'Private' | 'Unlisted';
  collaborators?: UserSummary[];
  collaboratorIds?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
  publishedDate?: string; // ISO String
  status?: 'Published' | 'Draft';
  votes?: number;
  accessType: 'public' | 'premium';
  allowedUsers?: AllowedUser[];
}

export interface UserSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
  dataAiHint?: string;
}

export interface ReadingListItem {
  id: string;
  title: string;
  coverImageUrl?: string;
  author?: UserSummary;
  chapters?: Chapter[];
  dataAiHint?: string;
  status?: 'Ongoing' | 'Completed' | 'Draft' | 'Unlisted' | 'Private';
  lastUpdated: any;
}

export interface User extends UserSummary {
  bio?: string;
  role?: 'reader' | 'writer';
  writtenStories?: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'status'>[];
  readingList?: ReadingListItem[];
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[];
  followers?: UserSummary[];
  email?: string;
  createdAt?: any; // Firestore Timestamp or ISO string
  updatedAt?: any; // Firestore Timestamp or ISO string
}

export interface Comment {
  id: string;
  user: UserSummary; // Information about the user who posted
  storyId: string;
  chapterId?: string; // Optional if comments can be on stories directly
  parentId?: string | null; // For replies
  content: string;
  timestamp: any; // Firestore Timestamp, or string/Date for client-side display
  likes?: number;
}

export interface Message {
  id: string;
  senderId: string; // UID of the sender
  content: string;
  timestamp: any; // Firestore Timestamp, or string for client-side display
}

export interface Conversation {
  id: string;
  participantIds: string[]; // Array of UIDs of participants
  participantInfo: { [key: string]: UserSummary }; // Map UID to UserSummary for easy lookup
  lastMessage: { 
    id: string;
    content: string;
    senderId: string;
    timestamp: any; 
  };
  updatedAt: any; // Firestore Timestamp for sorting conversations
}

export interface NotificationType {
  id: string;
  userId: string;
  type: 'new_follower' | 'new_chapter' | 'story_update' | 'announcement' | 'comment_reply' | 'mention' | 'new_letter' | 'letter_response' | 'premium_access';
  message: string;
  link?: string;
  timestamp: string; // ISO String
  isRead: boolean;
  actor?: UserSummary;
}

export interface Letter {
  id: string;
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterTitle: string;
  authorId: string;
  author: UserSummary;
  reader: UserSummary;
  content: string;
  visibility: 'public' | 'private';
  timestamp: any;
  isPinned?: boolean;
  authorResponse?: string;
  isReadByAuthor?: boolean;
}

export interface FeedPost {
  id: string;
  authorId: string;
  author: UserSummary; // Denormalized for easy display
  content: string;
  timestamp: any; // Firestore Server Timestamp
  storyId?: string; // Optional attached story
  storyTitle?: string;
  storyCoverUrl?: string;
  likesCount: number;
  likedBy: string[]; // List of user IDs who liked it
  commentsCount: number;
}
