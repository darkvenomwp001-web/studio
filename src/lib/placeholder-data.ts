import type { Story, User, Comment, Conversation, Message } from '@/types';

export const placeholderUsers: User[] = [
  {
    id: 'user1',
    username: 'CosmicReader',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Lover of all things sci-fi and fantasy. Aspiring author.',
    followersCount: 1250,
    followingCount: 300,
  },
  {
    id: 'user2',
    username: 'StoryWeaver',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Weaving tales one chapter at a time. Coffee addict.',
    followersCount: 850,
    followingCount: 150,
  },
  {
    id: 'user3',
    username: 'JaneDoeWrites',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Exploring new worlds through words.',
    followersCount: 500,
    followingCount: 70,
  },
];

export const placeholderStories: Story[] = [
  {
    id: 'story1',
    title: 'The Last Stargazer',
    author: placeholderUsers[0],
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'galaxy stars',
    summary: 'In a galaxy where stars are fading, a lone stargazer seeks the last spark of light.',
    tags: ['space opera', 'adventure', 'mystery'],
    chapters: [
      { id: 'c1', title: 'The Fading Sky', content: 'Content for chapter 1...', order: 1 },
      { id: 'c2', title: 'Whispers of the Void', content: 'Content for chapter 2...', order: 2 },
    ],
    rating: 4.8,
    views: 150000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'story2',
    title: 'Chronicles of the Shadow Forest',
    author: placeholderUsers[1],
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'enchanted forest',
    summary: 'An ancient evil stirs in the Shadow Forest, and only a band of unlikely heroes can stop it.',
    tags: ['high fantasy', 'magic', 'epic'],
    chapters: [
      { id: 'c1', title: 'The Call to Adventure', content: 'Content for chapter 1...', order: 1 },
      { id: 'c2', title: 'Into the Shadows', content: 'Content for chapter 2...', order: 2 },
      { id: 'c3', title: 'The First Trial', content: 'Content for chapter 3...', order: 3 },
    ],
    rating: 4.5,
    views: 95000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
  },
  {
    id: 'story3',
    title: 'Echoes of Tomorrow',
    author: placeholderUsers[0],
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'futuristic city',
    summary: 'In a future where emotions are suppressed, one individual starts to feel again.',
    tags: ['dystopian', 'sci-fi', 'rebellion'],
    chapters: [
      { id: 'c1', title: 'The Awakening', content: 'Content for chapter 1...', order: 1 },
    ],
    rating: 4.2,
    views: 72000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
  {
    id: 'story4',
    title: 'The Alchemist\'s Secret',
    author: placeholderUsers[2],
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'old library',
    summary: 'A young apprentice uncovers a dangerous secret hidden by a reclusive alchemist.',
    tags: ['mystery', 'history', 'alchemy'],
    chapters: [],
    rating: 4.0,
    views: 30000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
];

placeholderUsers[0].writtenStories = [
  { id: placeholderStories[0].id, title: placeholderStories[0].title, coverImageUrl: placeholderStories[0].coverImageUrl },
  { id: placeholderStories[2].id, title: placeholderStories[2].title, coverImageUrl: placeholderStories[2].coverImageUrl },
];
placeholderUsers[1].writtenStories = [
  { id: placeholderStories[1].id, title: placeholderStories[1].title, coverImageUrl: placeholderStories[1].coverImageUrl },
];
placeholderUsers[2].writtenStories = [
  { id: placeholderStories[3].id, title: placeholderStories[3].title, coverImageUrl: placeholderStories[3].coverImageUrl },
];


export const placeholderComments: Comment[] = [
  {
    id: 'comment1',
    user: placeholderUsers[1],
    storyId: 'story1',
    chapterId: 'c1',
    content: 'This is an amazing start! Can\'t wait for the next chapter.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    likes: 15,
  },
  {
    id: 'comment2',
    user: placeholderUsers[0],
    storyId: 'story1',
    chapterId: 'c1',
    parentId: 'comment1',
    content: 'Thank you! Working on it right now.',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    likes: 5,
  },
  {
    id: 'comment3',
    user: placeholderUsers[2],
    storyId: 'story2',
    content: 'What a thrilling conclusion! Loved the character development.',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    likes: 22,
  },
];

export const placeholderMessages: Message[] = [
  {
    id: 'msg1',
    sender: placeholderUsers[0],
    receiver: placeholderUsers[1],
    content: 'Hey! Loved your latest chapter on "Chronicles of the Shadow Forest". Want to co-author something sometime?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: true,
  },
  {
    id: 'msg2',
    sender: placeholderUsers[1],
    receiver: placeholderUsers[0],
    content: 'Thanks so much! That sounds interesting. What did you have in mind?',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    isRead: false,
  },
];

export const placeholderConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [placeholderUsers[0], placeholderUsers[1]],
    lastMessage: placeholderMessages[1],
    unreadCount: 1,
  },
  {
    id: 'conv2',
    participants: [placeholderUsers[0], placeholderUsers[2]],
    lastMessage: {
      id: 'msg3',
      sender: placeholderUsers[2],
      receiver: placeholderUsers[0],
      content: 'Just checking in on the release schedule for "Echoes of Tomorrow".',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      isRead: true,
    },
    unreadCount: 0,
  },
];
