
import type { Story, User, Comment, Conversation, Message, NotificationType, UserSummary } from '@/types';

export const placeholderUsers: User[] = [
  {
    id: 'user1FirebaseUid', // Simulate Firebase UID
    username: 'CosmicReader',
    displayName: 'Alex Cosmos',
    avatarUrl: 'https://placehold.co/100x100.png?text=AC',
    dataAiHint: "profile person",
    bio: 'Lover of all things sci-fi and fantasy. Aspiring author. Exploring new worlds through words and code.',
    followersCount: 1250,
    followingCount: 2,
    followingIds: ['user2FirebaseUid', 'user3FirebaseUid'],
    role: 'writer',
    email: 'cosmic@example.com',
  },
  {
    id: 'user2FirebaseUid', // Simulate Firebase UID
    username: 'StoryWeaver',
    displayName: 'Bella Story',
    avatarUrl: 'https://placehold.co/100x100.png?text=BS',
    dataAiHint: "profile person",
    bio: 'Weaving tales one chapter at a time. Coffee addict. Always looking for the next great read.',
    followersCount: 850,
    followingCount: 1,
    followingIds: ['user1FirebaseUid'],
    role: 'reader',
    email: 'storyweaver@example.com',
  },
  {
    id: 'user3FirebaseUid', // Simulate Firebase UID
    username: 'JaneDoeWrites',
    displayName: 'Jane Doe',
    avatarUrl: 'https://placehold.co/100x100.png?text=JD',
    dataAiHint: "profile person",
    bio: 'Exploring new worlds through words. Thriller and mystery enthusiast.',
    followersCount: 500,
    followingCount: 1,
    followingIds: ['user1FirebaseUid'],
    role: 'writer',
    email: 'jane.writes@example.com',
  },
  {
    id: 'user4FirebaseUid', // Simulate Firebase UID
    username: 'ReaderGuy',
    displayName: 'Sam Reads',
    avatarUrl: 'https://placehold.co/100x100.png?text=SR',
    dataAiHint: "profile person",
    bio: 'Just here to read amazing stories!',
    followersCount: 50,
    followingCount: 3,
    followingIds: ['user1FirebaseUid', 'user2FirebaseUid', 'user3FirebaseUid'],
    role: 'reader',
    email: 'readerguy@example.com',
  },
  { // User who might have signed up with Google, minimal initial data
    id: 'googleUser1Uid',
    username: 'gleslie', // Derived or set post-signup
    displayName: 'Google Leslie', // From Google profile
    avatarUrl: 'https://placehold.co/100x100.png?text=GL',
    dataAiHint: "profile person",
    bio: 'Just joined via Google!',
    followersCount: 5,
    followingCount: 1,
    followingIds: ['user1FirebaseUid'],
    role: 'reader',
    email: 'google.leslie@example.com',
  },
  { // Another user for searching
    id: 'anotherUserUid',
    username: 'MysteryFan',
    displayName: 'Mike Y. Sterry',
    avatarUrl: 'https://placehold.co/100x100.png?text=MS',
    dataAiHint: "profile person",
    bio: 'Loves a good whodunit.',
    followersCount: 78,
    followingCount: 12,
    followingIds: ['user3FirebaseUid'],
    role: 'reader',
    email: 'mike.sterry@example.com',
  }
];

const summarizeUser = (user: User): UserSummary => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName || user.username,
  avatarUrl: user.avatarUrl,
});


export const placeholderStories: Story[] = [
  {
    id: 'story1',
    title: 'The Last Stargazer',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'galaxy stars',
    summary: 'In a galaxy where stars are fading, a lone stargazer seeks the last spark of light. Their journey will uncover ancient secrets and a destiny intertwined with the fate of the cosmos.',
    tags: ['space opera', 'adventure', 'mystery', 'chosen one'],
    chapters: [
      { id: 'c1s1', title: 'The Fading Sky', content: 'Content for chapter 1 of The Last Stargazer...', order: 1 },
      { id: 'c1s2', title: 'Whispers of the Void', content: 'Content for chapter 2 of The Last Stargazer...', order: 2 },
    ],
    rating: 4.8,
    views: 150000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'story2',
    title: 'Chronicles of the Shadow Forest',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'enchanted forest',
    summary: 'An ancient evil stirs in the Shadow Forest, and only a band of unlikely heroes can stop it. Magic, monsters, and betrayal await those brave enough to enter.',
    tags: ['high fantasy', 'magic', 'epic', 'quest'],
    chapters: [
      { id: 'c2s1', title: 'The Call to Adventure', content: 'Content for chapter 1 of Shadow Forest...', order: 1 },
      { id: 'c2s2', title: 'Into the Shadows', content: 'Content for chapter 2 of Shadow Forest...', order: 2 },
      { id: 'c2s3', title: 'The First Trial', content: 'Content for chapter 3 of Shadow Forest...', order: 3 },
    ],
    rating: 4.5,
    views: 95000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
  },
  {
    id: 'story3',
    title: 'Echoes of Tomorrow',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'futuristic city',
    summary: 'In a future where emotions are suppressed by a totalitarian regime, one individual starts to feel again, sparking a rebellion that could change everything.',
    tags: ['dystopian', 'sci-fi', 'rebellion', 'social commentary'],
    chapters: [
      { id: 'c3s1', title: 'The Awakening', content: 'Content for chapter 1 of Echoes of Tomorrow...', order: 1 },
    ],
    rating: 4.2,
    views: 72000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
  {
    id: 'story4',
    title: 'The Alchemist\'s Secret',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'old library',
    summary: 'Set in Renaissance Florence, a young apprentice uncovers a dangerous secret hidden by a reclusive alchemist, leading to a thrilling chase across the city.',
    tags: ['mystery', 'history', 'alchemy', 'renaissance'],
    chapters: [],
    rating: 4.0,
    views: 30000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
];

placeholderUsers.forEach(user => {
  user.writtenStories = placeholderStories
    .filter(story => story.author.id === user.id)
    .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl, status: story.status }));
  user.readingList = placeholderStories
    .filter(story => !user.writtenStories?.some(ws => ws.id === story.id))
    .slice(0, 2)
    .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl }));
});


export const placeholderComments: Comment[] = [
  {
    id: 'comment1',
    user: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    storyId: 'story1',
    chapterId: 'c1s1',
    content: 'This is an amazing start! Can\'t wait for the next chapter.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), 
    likes: 15,
  },
  {
    id: 'comment2',
    user: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    storyId: 'story1',
    chapterId: 'c1s1',
    parentId: 'comment1',
    content: 'Thank you! Working on it right now.',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), 
    likes: 5,
  },
  {
    id: 'comment3',
    user: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    storyId: 'story2',
    content: 'What a thrilling conclusion! Loved the character development.',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), 
    likes: 22,
  },
];

export const placeholderMessages: Message[] = [
  {
    id: 'msg1',
    sender: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    receiver: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    content: 'Hey! Loved your latest chapter on "Chronicles of the Shadow Forest". Want to co-author something sometime?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: true,
  },
  {
    id: 'msg2',
    sender: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    receiver: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    content: 'Thanks so much! That sounds interesting. What did you have in mind?',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    isRead: false,
  },
];

export const placeholderConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!), summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!)],
    lastMessage: placeholderMessages[1],
    unreadCount: 1,
  },
  {
    id: 'conv2',
    participants: [summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!), summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!)],
    lastMessage: {
      id: 'msg3',
      sender: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
      receiver: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
      content: 'Just checking in on the release schedule for "Echoes of Tomorrow".',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      isRead: true,
    },
    unreadCount: 0,
  },
];


export const placeholderNotifications: NotificationType[] = [
  {
    id: 'notif1',
    type: 'new_follower',
    actor: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    message: `${placeholderUsers.find(u => u.id === 'user3FirebaseUid')?.displayName} started following you.`,
    link: `/profile/${placeholderUsers.find(u => u.id === 'user3FirebaseUid')?.id}`,
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), 
    isRead: false,
  },
  {
    id: 'notif2',
    type: 'new_chapter',
    actor: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    message: `${placeholderUsers.find(u => u.id === 'user1FirebaseUid')?.displayName} published a new chapter for "The Last Stargazer": Chapter 2 - Whispers of the Void.`,
    link: `/stories/story1`, 
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), 
    isRead: false,
  },
  {
    id: 'notif3',
    type: 'comment_reply',
    actor: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    message: `${placeholderUsers.find(u => u.id === 'user2FirebaseUid')?.displayName} replied to your comment on "Chronicles of the Shadow Forest".`,
    link: `/stories/story2`, 
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), 
    isRead: true,
  },
   {
    id: 'notif4',
    type: 'announcement',
    message: `Welcome to the new D4RKV3NOM platform! Explore and enjoy the new features.`,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), 
    isRead: true,
  },
];
