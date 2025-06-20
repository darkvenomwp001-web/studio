
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
  lastUpdated: string; // ISO String
  language?: string;
  visibility?: 'Public' | 'Private' | 'Unlisted';
  collaborators?: UserSummary[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
  publishedDate?: string; // ISO String
  status?: 'Published' | 'Draft';
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
  chapters?: Chapter[];
  dataAiHint?: string;
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
  user: UserSummary;
  storyId: string;
  chapterId?: string;
  parentId?: string;
  content: string;
  timestamp: string; // ISO String
  likes?: number;
}

export interface Message {
  id: string;
  senderId: string; // UID of the sender
  content: string;
  timestamp: any; // Firestore Timestamp, or string for client-side display
  // UserSummary for sender is derived from Conversation.participantInfo
}

export interface Conversation {
  id: string;
  participantIds: string[]; // Array of UIDs of participants
  participantInfo: { [key: string]: UserSummary }; // Map UID to UserSummary for easy lookup
  lastMessage: { // Store a summary of the last message
    id: string;
    senderId: string;
    content: string;
    timestamp: any; // Firestore Timestamp, or string
  };
  updatedAt: any; // Firestore Timestamp for sorting conversations
  // unreadCount could be a map like: { [userId: string]: number }
}

export interface NotificationType {
  id: string;
  type: 'new_follower' | 'new_chapter' | 'story_update' | 'announcement' | 'comment_reply' | 'mention';
  message: string;
  link?: string;
  timestamp: string; // ISO String
  isRead: boolean;
  actor?: UserSummary;
}
