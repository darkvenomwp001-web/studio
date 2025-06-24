
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string; // Document ID from Firestore (auth UID)
  username: string;
  email?: string;
  bio?: string;
  avatarUrl?: string; // Sticking with avatarUrl for consistency with app code
  displayName?: string;
  role?: 'reader' | 'writer';
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[];
  writtenStories?: Story[]; // Changed to hold full story objects for attach feature
  readingList?: ReadingListItem[];
  createdAt?: any;
  updatedAt?: any;
  dataAiHint?: string; // Added for AI image hints
}

export interface UserSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
}

export interface Story {
  id: string;
  author: UserSummary;
  title: string;
  summary: string; // Changed from description for consistency
  genre: string;
  chapters: Chapter[];
  status: 'Ongoing' | 'Completed' | 'Draft';
  visibility: 'Public' | 'Private' | 'Unlisted';
  lastUpdated: any; // Can be serverTimestamp or string
  coverImageUrl?: string;
  language?: string;
  isMature?: boolean;
  tags: string[];
  views?: number;
  collaborators?: UserSummary[];
  collaboratorIds?: string[];
  dataAiHint?: string;
  rating?: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'Published' | 'Draft';
  wordCount?: number;
  votes?: number;
  publishedDate?: string;
  accessType: 'public' | 'premium';
  allowedUsers?: AllowedUser[];
}

export interface AllowedUser {
  userId: string;
  username: string;
  expiresAt: any; // Can be Timestamp
}

export interface UserNote {
  id: string;
  authorId: string;
  author: UserSummary;
  content: string;
  visibility: 'public' | 'followers';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Comment {
  id: string;
  user: UserSummary;
  storyId: string;
  chapterId: string;
  content: string; // Changed from text
  timestamp: any; // Can be serverTimestamp or Timestamp
  parentId?: string | null;
  likes?: number;
}

export interface ReadingListItem {
  id: string;
  title: string;
  author: UserSummary;
  chapters: Chapter[];
  lastUpdated: any;
  coverImageUrl?: string;
  dataAiHint?: string;
  status?: 'Ongoing' | 'Completed' | 'Draft';
}

export interface NotificationType {
    id: string;
    userId: string;
    type: 'new_follower' | 'new_chapter' | 'story_update' | 'comment_reply' | 'mention' | 'announcement' | 'new_letter' | 'letter_response' | 'premium_access';
    message: string;
    link: string;
    isRead: boolean;
    timestamp: any; // Can be serverTimestamp or string from converted date
    actor: UserSummary; // The user who performed the action
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
    timestamp: Timestamp;
    isPinned: boolean;
    isReadByAuthor: boolean;
    authorResponse?: string;
}

export interface FeedPost {
    id: string;
    authorId: string;
    author: UserSummary;
    content: string;
    timestamp: any;
    likesCount: number;
    likedBy: string[]; // Array of user IDs
    commentsCount: number;
    storyId?: string; // Optional attached story
    storyTitle?: string;
    storyCoverUrl?: string;
}

export interface Conversation {
    id: string;
    participantIds: string[];
    participantInfo: { [key: string]: UserSummary };
    updatedAt: any;
    lastMessage: {
        id: string;
        content: string;
        senderId: string;
        timestamp: any;
    };
}

export interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: any;
}

export interface UserStory {
  id: string;
  userId: string;
  username: string;
  userAvatarUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  viewedBy: string[];
}
