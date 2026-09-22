import type { Timestamp } from 'firebase/firestore';

export type WritingStatus = 
  | 'writing' 
  | 'break' 
  | 'hiatus' 
  | 'update' 
  | 'burnout' 
  | 'school' 
  | 'rewriting' 
  | 'brainstorming'
  | 'none';

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
  authorBio?: string;
  avatarUrl?: string; 
  coverImageUrl?: string;
  displayName?: string;
  role?: 'reader' | 'writer' | 'moderator';
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[];
  closeFriendIds?: string[]; 
  blockedUserIds?: string[]; 
  fcmTokens?: string[]; 
  readingList?: ReadingListItem[];
  level?: number;
  xp?: number;
  achievements?: Achievement[];
  writingStatus?: WritingStatus;
  profilePrivacy?: 'public' | 'private' | 'locked';
  messagingPreference?: 'everyone' | 'following' | 'none';
  privacySettings?: {
      lastSeen?: 'everyone' | 'following' | 'none';
      onlineStatus?: 'everyone' | 'following' | 'none';
      profilePhoto?: 'everyone' | 'following' | 'none';
      stories?: 'everyone' | 'following' | 'none';
      readReceipts?: boolean;
  };
  appearanceSettings?: {
    accentColor: string;
    fontFamily: 'sans' | 'serif';
    density: 'cozy' | 'compact';
    glassmorphism: boolean;
    oledMode: boolean;
    motionLevel: 'full' | 'reduced';
    autoDim: boolean;
    parchmentMode: boolean;
    cornerStyle: 'minimal' | 'rounded' | 'organic';
    ambientSound: 'none' | 'lofi' | 'rain';
  };
  readerSettings?: {
    swipeToNavigate: boolean;
    navigationStyle: 'horizontal' | 'vertical';
    autoNextChapter: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
  isAnonymous?: boolean;
  isBanned?: boolean; 
  isVerified?: boolean; 
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
  tags: string[];
  views?: number;
  collaboratorIds?: string[];
  notes?: string;
  disclaimer?: string;
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
  accessType: 'public' | 'premium' | 'exclusive';
  invitedUserIds?: string[];
  scheduledAt?: any;
  artworkUrl?: string;
  views?: number;
  commentsCount?: number;
}

export interface Comment {
  id: string;
  user: UserSummary;
  storyId?: string;
  chapterId?: string;
  content: string; 
  timestamp: any; 
  parentId?: string | null;
  likes?: number;
  quote?: string;
  isSpoiler?: boolean;
}

export interface ReadingListItem {
  id: string;
  title: string;
  author: UserSummary;
  chapters: Chapter[];
  lastUpdated: any;
  coverImageUrl?: string;
  status?: 'Ongoing' | 'Completed' | 'Draft';
}

export interface Annotation {
    id: string;
    userId: string;
    authorInfo?: UserSummary;
    storyId: string;
    chapterId: string;
    storyTitle: string; 
    chapterTitle: string; 
    highlightedText: string;
    highlightColor: string;
    note?: string;
    timestamp: any;
    visibility?: 'public' | 'private';
    reactionsCount?: number;
    reactionCounts?: Record<string, number>;
    commentsCount?: number;
}

export interface NotificationType {
    id: string;
    userId: string;
    type: 'new_follower' | 'new_chapter' | 'story_update' | 'comment_reply' | 'mention' | 'announcement' | 'new_letter' | 'letter_response' | 'premium_access' | 'achievement_unlocked' | 'author_announcement' | 'app_update' | 'user_update' | 'notice_update';
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
    themeColor?: string;
    nicknames?: Record<string, string>;
    mutedBy?: string[];
    archivedBy?: string[];
    ignoredBy?: string[];
    pinnedBy?: string[];
}

export interface Message {
    id:string;
    senderId: string;
    content: string;
    timestamp: any;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'music';
    mediaUrl?: string;
    isDisappearing?: boolean;
    expiresAt?: any;
    replyTo?: {
        id: string;
        content: string;
        username: string;
    };
    reactions?: Record<string, string>;
    isEdited?: boolean;
    deletedFor?: string[]; // Array of UIDs who deleted for themselves
    isPinned?: boolean;
    isUnsent?: boolean;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'angry' | 'happy';

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
    images?: { url: string; caption?: string }[];
    timestamp: any;
    reactionsCount?: number;
    reactionCounts?: Record<ReactionType, number>;
    commentsCount: number;
    repostCount?: number;
    isPinned?: boolean;
    isHidden?: boolean;
    type: 'original' | 'repost' | 'studio_journal' | 'identity_visual';
}

export interface Broadcast {
  id: string;
  author: UserSummary;
  content: string;
  category: 'feature' | 'bugfix' | 'maintenance' | 'announcement';
  status: 'new' | 'progress' | 'live' | 'fixed';
  priority: 'low' | 'normal' | 'high';
  isPinned: boolean;
  imageUrl?: string;
  timestamp: any;
  reactionsCount: number;
  reactionCounts?: Record<ReactionType, number>;
  commentsCount: number;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    cover: string;
    previewUrl?: string;
    source?: 'spotify' | 'itunes';
    lyrics: { time: number, text: string }[];
}

export interface StatusUpdate {
    id: string;
    authorId: string;
    authorInfo: UserSummary;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    images?: { url: string; mediaType: 'image' | 'video' }[];
    collageLayout?: 'single' | '2-v' | '2-h' | '3-t' | '4-g';
    textOverlay?: string;
    expiresAt: any | null;
    createdAt: any;
    status: 'published' | 'draft';
    visibility: 'public' | 'close-friends';
    isHidden?: boolean;
    mediaTransform?: { scale: number; rotation: number; x: number; y: number };
    reactionsCount?: number;
    reactionCounts?: Record<string, number>;
    textOverlayStyle?: {
        font?: 'sans' | 'serif' | 'mono';
        alignment?: 'left' | 'center' | 'right';
        background?: 'none' | 'translucent' | 'solid';
        color?: string;
    };
    textOverlayPosition?: { x: number, y: number };
    textOverlayTransform?: { scale: number, rotation: number };
    songUrl?: string;
    spotifyUrl?: string;
}

export interface CarouselSlide {
    id: string;
    title: string;
    imageUrl: string;
    ctaLink: string;
    order: number;
    isActive: boolean;
    createdAt: any;
}

export interface TextOverlayStyle {
    font: 'sans' | 'serif' | 'mono';
    alignment: 'left' | 'center' | 'right';
    background: 'none' | 'translucent' | 'solid';
    color: string;
}
