
export interface Story {
  id: string;
  title: string;
  author: User; // Changed from Pick<User,...> to User for simplicity if author is fully fetched
  genre: string;
  coverImageUrl?: string;
  dataAiHint?: string; 
  summary: string;
  tags: string[];
  chapters: Chapter[];
  rating?: number;
  views?: number;
  isMature?: boolean;
  status?: 'Ongoing' | 'Completed' | 'Draft'; // Added 'Draft'
  lastUpdated: string; // ISO date string
}

export interface Chapter {
  id: string;
  title: string;
  content: string; 
  order: number;
  wordCount?: number;
  publishedDate?: string; 
}

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  writtenStories?: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'status'>[]; // Added status
  readingList?: Pick<Story, 'id' | 'title' | 'coverImageUrl'>[];
  followersCount?: number;
  followingCount?: number;
  // email?: string; // FirebaseUser has email, might be useful
}

export interface Comment {
  id: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  storyId: string;
  chapterId?: string; 
  parentId?: string; 
  content: string;
  timestamp: string; 
  likes?: number;
}

export interface Message {
  id: string;
  sender: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  receiver: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  content: string;
  timestamp: string; 
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  participants: Pick<User, 'id' | 'username' | 'avatarUrl'>[];
  lastMessage: Message;
  unreadCount?: number;
}
