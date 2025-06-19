
import type { Story, User, Comment, Conversation, Message, NotificationType, UserSummary } from '@/types';

export const placeholderUsers: User[] = [
  {
    id: 'user1',
    username: 'CosmicReader',
    displayName: 'Alex Cosmos',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Lover of all things sci-fi and fantasy. Aspiring author. Exploring new worlds through words and code.',
    followersCount: 1250,
    followingCount: 300,
    followingIds: ['user2'],
    role: 'writer',
    email: 'cosmic@example.com',
  },
  {
    id: 'user2',
    username: 'StoryWeaver',
    displayName: 'Bella Story',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Weaving tales one chapter at a time. Coffee addict. Always looking for the next great read.',
    followersCount: 850,
    followingCount: 150,
    followingIds: ['user1', 'user3'],
    role: 'reader',
    email: 'storyweaver@example.com',
  },
  {
    id: 'user3',
    username: 'JaneDoeWrites',
    displayName: 'Jane Doe',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Exploring new worlds through words. Thriller and mystery enthusiast.',
    followersCount: 500,
    followingCount: 70,
    followingIds: [],
    role: 'writer',
    email: 'jane.writes@example.com',
  },
  {
    id: 'user4', // Adding a new user for more interactions
    username: 'ReaderGuy',
    displayName: 'Sam Reads',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Just here to read amazing stories!',
    followersCount: 50,
    followingCount: 120,
    followingIds: ['user1', 'user2', 'user3'],
    role: 'reader',
    email: 'readerguy@example.com',
  },
];

const summarizeUser = (user: User): UserSummary => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
});


export const placeholderStories: Story[] = [
  {
    id: 'story1',
    title: 'The Last Stargazer',
    author: summarizeUser(placeholderUsers[0]),
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
    author: summarizeUser(placeholderUsers[1]),
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
    author: summarizeUser(placeholderUsers[0]),
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
    author: summarizeUser(placeholderUsers[2]),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/300x450.png',
    dataAiHint: 'old library',
    summary: 'Set in Renaissance Florence, a young apprentice uncovers a dangerous secret hidden by a reclusive alchemist, leading to a thrilling chase across the city.',
    tags: ['mystery', 'history', 'alchemy', 'renaissance'],
    chapters: [], // No chapters yet for this one, implying it's newly started or just a summary.
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
    .filter(story => story.id !== user.writtenStories?.find(ws => ws.id === story.id)?.id) // Simple mock: not their own stories
    .slice(0, 2)
    .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl }));
});


export const placeholderComments: Comment[] = [
  {
    id: 'comment1',
    user: summarizeUser(placeholderUsers[1]),
    storyId: 'story1',
    chapterId: 'c1s1',
    content: 'This is an amazing start! Can\'t wait for the next chapter.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    likes: 15,
  },
  {
    id: 'comment2',
    user: summarizeUser(placeholderUsers[0]),
    storyId: 'story1',
    chapterId: 'c1s1',
    parentId: 'comment1',
    content: 'Thank you! Working on it right now.',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    likes: 5,
  },
  {
    id: 'comment3',
    user: summarizeUser(placeholderUsers[2]),
    storyId: 'story2',
    content: 'What a thrilling conclusion! Loved the character development.',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    likes: 22,
  },
];

export const placeholderMessages: Message[] = [
  {
    id: 'msg1',
    sender: summarizeUser(placeholderUsers[0]),
    receiver: summarizeUser(placeholderUsers[1]),
    content: 'Hey! Loved your latest chapter on "Chronicles of the Shadow Forest". Want to co-author something sometime?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: true,
  },
  {
    id: 'msg2',
    sender: summarizeUser(placeholderUsers[1]),
    receiver: summarizeUser(placeholderUsers[0]),
    content: 'Thanks so much! That sounds interesting. What did you have in mind?',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    isRead: false,
  },
];

export const placeholderConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [summarizeUser(placeholderUsers[0]), summarizeUser(placeholderUsers[1])],
    lastMessage: placeholderMessages[1],
    unreadCount: 1,
  },
  {
    id: 'conv2',
    participants: [summarizeUser(placeholderUsers[0]), summarizeUser(placeholderUsers[2])],
    lastMessage: {
      id: 'msg3',
      sender: summarizeUser(placeholderUsers[2]),
      receiver: summarizeUser(placeholderUsers[0]),
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
    actor: summarizeUser(placeholderUsers[2]),
    message: `${placeholderUsers[2].displayName} started following you.`,
    link: `/profile/${placeholderUsers[2].id}`,
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    isRead: false,
  },
  {
    id: 'notif2',
    type: 'new_chapter',
    actor: summarizeUser(placeholderUsers[0]),
    message: `${placeholderUsers[0].displayName} published a new chapter for "The Last Stargazer": Chapter 2 - Whispers of the Void.`,
    link: `/stories/story1`, // Link to the story
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    isRead: false,
  },
  {
    id: 'notif3',
    type: 'comment_reply',
    actor: summarizeUser(placeholderUsers[1]),
    message: `${placeholderUsers[1].displayName} replied to your comment on "Chronicles of the Shadow Forest".`,
    link: `/stories/story2`, // Link to the story/comment
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    isRead: true,
  },
   {
    id: 'notif4',
    type: 'announcement',
    message: `Welcome to the new LitVerse platform! Explore and enjoy the new features.`,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    isRead: true,
  },
];
