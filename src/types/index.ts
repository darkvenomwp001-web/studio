
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
  status?: 'Ongoing' | 'Completed' | 'Draft'; 
  lastUpdated: string; 
}

export interface Chapter {
  id: string;
  title: string;
  content: string; 
  order: number;
  wordCount?: number;
  publishedDate?: string; 
}

export interface UserSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
}

export interface User extends UserSummary {
  bio?: string;
  role?: 'reader' | 'writer';
  writtenStories?: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'status'>[]; 
  readingList?: Pick<Story, 'id' | 'title' | 'coverImageUrl'>[];
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[]; // IDs of users this user is following
  email?: string;
}

export interface Comment {
  id: string;
  user: UserSummary;
  storyId: string;
  chapterId?: string; 
  parentId?: string; 
  content: string;
  timestamp: string; 
  likes?: number;
}

export interface Message {
  id: string;
  sender: UserSummary;
  receiver: UserSummary;
  content: string;
  timestamp: string; 
  isRead?: boolean;
}

export interface Conversation {
  id: 'conv1' | 'conv2'; // Making it more specific for placeholder data
  participants: UserSummary[];
  lastMessage: Message;
  unreadCount?: number;
}

export interface NotificationType {
  id: string;
  type: 'new_follower' | 'new_chapter' | 'story_update' | 'announcement' | 'comment_reply' | 'mention';
  message: string;
  link?: string; // e.g., to a story, profile, or comment
  timestamp: string;
  isRead: boolean;
  actor?: UserSummary; // User who performed the action
}
