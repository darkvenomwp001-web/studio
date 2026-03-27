
import type { Timestamp } from 'firebase/firestore';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
}

export interface User {
  id: string; 
  username: string;
  email?: string;
  emailVerified?: boolean;
  bio?: string;
  avatarUrl?: string; 
  displayName?: string;
  role?: 'reader' | 'writer' | 'moderator';
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[];
  closeFriendIds?: string[]; 
  fcmTokens?: string[]; 
  writtenStories?: Story[]; 
  readingList?: ReadingListItem[];
  readChapters?: { [storyId: string]: string[] }; 
  shelves?: Shelf[]; 
  level?: number;
  xp?: number;
  achievements?: Achievement[];
  profileSongUrl?: string;
  profileSongNote?: string;
  createdAt?: any;
  updatedAt?: any;
  dataAiHint?: string; 
  isAnonymous?: boolean;
  isBanned?: boolean; 
  isVerified?: boolean; 
  messagingPreference?: 'everyone' | 'following' | 'none';
  notificationSettings?: {
    emailOnNewFollower: boolean;
    emailOnCommentReply: boolean;
    emailOnNewLetter: boolean;
    emailOnNews: boolean;
  };
  appearanceSettings?: {
    accentColor: 'default' | 'romance' | 'emerald' | 'amber' | 'midnight';
    fontFamily: 'sans' | 'serif';
    density: 'cozy' | 'compact';
    glassmorphism: boolean;
    oledMode: boolean;
    motionLevel: 'full' | 'reduced';
    autoDim: boolean;
  };
}

export interface UserSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
}

export interface Story {
  id: string;
  author: UserSummary;
  title: string;
  summary: string; 
  genre: string;
  chapters: Chapter[];
  status: 'Ongoing' | 'Completed' | 'Draft';
  visibility: 'Public' | 'Private' | 'Unlisted';
  lastUpdated: any; 
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
  voterIds?: string[];
  publishedDate?: string;
  accessType: 'public' | 'premium';
  allowedUsers?: AllowedUser[];
}

export interface AllowedUser {
  userId: string;
  username: string;
  expiresAt: any; 
}

export interface Comment {
  id: string;
  user: UserSummary;
  storyId: string;
  chapterId: string;
  content: string; 
  timestamp: any; 
  parentId?: string | null;
  likes?: number;
  quote?: string;
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

export interface Shelf {
    id: string;
    name: string;
    storyIds: string[];
    createdAt: any;
}

export interface Annotation {
    id: string;
    userId: string;
    storyId: string;
    chapterId: string;
    storyTitle: string; 
    chapterTitle: string; 
    highlightedText: string;
    highlightColor: string;
    note?: string;
    timestamp: any;
}

export interface NotificationType {
    id: string;
    userId: string;
    type: 'new_follower' | 'new_chapter' | 'story_update' | 'comment_reply' | 'mention' | 'announcement' | 'new_letter' | 'letter_response' | 'premium_access' | 'achievement_unlocked' | 'author_announcement' | 'author_announcement';
    message: string;
    link: string;
    isRead: boolean;
    timestamp: any; 
    actor: UserSummary; 
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

export interface Question {
  id: string;
  asker: UserSummary;
  authorId: string;
  questionText: string;
  status: 'unanswered' | 'answered';
  createdAt: any;
  answerText?: string;
  answeredAt?: any;
  answerer?: UserSummary;
}

export interface Conversation {
    id: string;
    participantIds: string[];
    participantInfo: { [key: string]: UserSummary & { bio?: string } };
    updatedAt: any;
    lastMessage: {
        id: string;
        content: string;
        senderId: string;
        timestamp: any;
        isRead?: boolean;
    };
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
}

export interface Message {
    id:string;
    senderId: string;
    content: string;
    timestamp: any;
    type?: 'text' | 'poll' | 'question';
    poll?: Poll;
    question?: Question;
}

export interface GlobalChatMessage {
    id: string;
    author: UserSummary;
    content: string;
    timestamp: any; 
}

export interface Poll {
    id: string;
    authorId: string;
    question: string;
    options: { id: string; text: string; votes: string[] }[];
    createdAt: any;
}

export type ReactionType = 'like' | 'love';

export interface Reaction {
    id: string; 
    type: ReactionType;
    timestamp: any;
    user: UserSummary;
}

export interface ThreadPost {
    id: string;
    author: UserSummary;
    content: string;
    storyId?: string;
    storyTitle?: string;
    storyCoverUrl?: string;
    imageUrl?: string;
    dataAiHint?: string;
    songUrl?: string;
    songLyricSnippet?: string;
    timestamp: any;
    reactionsCount?: number;
    commentsCount: number;
    repostCount?: number;
    isPinned?: boolean;
    isHidden?: boolean;
    type: 'original' | 'repost';
    originalPost?: {
      id: string;
      author: UserSummary;
      content: string;
      timestamp: any;
      storyId?: string;
      storyTitle?: string;
      storyCoverUrl?: string;
      imageUrl?: string;
      songUrl?: string;
    }
}

export interface Prompt {
    id: string;
    title: string;
    prompt: string;
    genre: string;
    createdAt: any;
    author: UserSummary;
    isArchived: boolean;
    archivedAt?: any;
}

export interface TextOverlayStyle {
    font: 'sans' | 'serif' | 'mono';
    color: string;
    alignment: 'left' | 'center' | 'right';
    background: 'none' | 'solid' | 'translucent';
}

export interface StatusUpdate {
    id: string;
    authorId: string;
    authorInfo: UserSummary;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    textOverlay?: string;
    textOverlayStyle?: TextOverlayStyle;
    textOverlayPosition?: { x: number; y: number };
    note?: string;
    noteStyle?: { font: 'sans' | 'serif' | 'mono', alignment: 'left' | 'center' | 'right' };
    backgroundStyle?: string;
    spotifyUrl?: string;
    songLyricSnippet?: string;
    dynamicBgColor?: string;
    vibeTags?: string[];
    poll?: Poll;
    sharedStoryId?: string;
    prompt?: string;
    expiresAt: any | null;
    createdAt: any;
    status: 'published' | 'draft';
    visibility: 'public' | 'close-friends';
    isHidden?: boolean;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    cover: string;
    lyrics: {
        time: number;
        text: string;
    }[];
}

export interface Announcement {
    id: string;
    author: UserSummary;
    content: string;
    timestamp: any;
}
