
export interface Story {
  id: string;
  title: string;
  author: User; 
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

export interface User {
  id: string;
  username: string;
  displayName?: string; // Added for main name
  avatarUrl?: string;
  bio?: string;
  role?: 'reader' | 'writer'; // Added role
  writtenStories?: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'status'>[]; 
  readingList?: Pick<Story, 'id' | 'title' | 'coverImageUrl'>[];
  followersCount?: number;
  followingCount?: number;
  email?: string; // Already present from FirebaseUser mapping
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
