export interface Story {
  id: string;
  title: string;
  author: User;
  genre: string;
  coverImageUrl?: string;
  dataAiHint?: string; // Added for AI image generation hint
  summary: string;
  tags: string[];
  chapters: Chapter[];
  rating?: number;
  views?: number;
  isMature?: boolean;
  status?: 'Ongoing' | 'Completed';
  lastUpdated: string; // ISO date string
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // Could be Markdown or rich text
  order: number;
  wordCount?: number;
  publishedDate?: string; // ISO date string
}

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  writtenStories?: Pick<Story, 'id' | 'title' | 'coverImageUrl'>[];
  readingList?: Pick<Story, 'id' | 'title' | 'coverImageUrl'>[];
  followersCount?: number;
  followingCount?: number;
}

export interface Comment {
  id: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  storyId: string;
  chapterId?: string; // Optional, for chapter-specific comments
  parentId?: string; // For threaded replies
  content: string;
  timestamp: string; // ISO date string
  likes?: number;
}

export interface Message {
  id: string;
  sender: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  receiver: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  content: string;
  timestamp: string; // ISO date string
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  participants: Pick<User, 'id' | 'username' | 'avatarUrl'>[];
  lastMessage: Message;
  unreadCount?: number;
}
