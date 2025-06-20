
import type { Story, User, Comment, Conversation, Message, NotificationType, UserSummary, Chapter } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { db } from './firebase'; // Assuming db is exported from firebase setup
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';


// NOTE: With Firestore integration, this file becomes less relevant for data that's live.
// It's still useful for mock fallbacks, initial structures, or parts not yet migrated.

// Initial placeholder users (keep as is, useAuth will now primarily use Firestore for current user)
export let placeholderUsers: User[] = [ 
  {
    id: 'user1FirebaseUid', 
    username: 'CosmicReader',
    displayName: 'Alex Cosmos',
    avatarUrl: 'https://placehold.co/100x100.png?text=AC',
    dataAiHint: "profile person",
    bio: 'Lover of all things sci-fi and fantasy. Aspiring author. Exploring new worlds through words and code.',
    followersCount: 1250,
    followingCount: 3,
    followingIds: ['user2FirebaseUid', 'user3FirebaseUid', 'user4FirebaseUid'],
    role: 'writer',
    email: 'cosmic@example.com',
  },
  {
    id: 'user2FirebaseUid', 
    username: 'StoryWeaver',
    displayName: 'Bella Story',
    avatarUrl: 'https://placehold.co/100x100.png?text=BS',
    dataAiHint: "profile person",
    bio: 'Weaving tales one chapter at a time. Coffee addict. Always looking for the next great read.',
    followersCount: 850,
    followingCount: 2,
    followingIds: ['user1FirebaseUid', 'user3FirebaseUid'],
    role: 'reader',
    email: 'storyweaver@example.com',
  },
  {
    id: 'user3FirebaseUid', 
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
    id: 'user4FirebaseUid', 
    username: 'ReaderGuy',
    displayName: 'Sam Reads',
    avatarUrl: 'https://placehold.co/100x100.png?text=SR',
    dataAiHint: "profile person",
    bio: 'Just here to read amazing stories!',
    followersCount: 50,
    followingCount: 1,
    followingIds: ['user2FirebaseUid'],
    role: 'reader',
    email: 'readerguy@example.com',
  },
  {
    id: 'googleUser1Uid',
    username: 'gleslie',
    displayName: 'Google Leslie',
    avatarUrl: 'https://placehold.co/100x100.png?text=GL',
    dataAiHint: "profile person",
    bio: 'Just joined via Google!',
    followersCount: 5,
    followingCount: 2,
    followingIds: ['user1FirebaseUid', 'user4FirebaseUid'],
    role: 'reader',
    email: 'google.leslie@example.com',
  },
  {
    id: 'anotherUserUid',
    username: 'MysteryFan',
    displayName: 'Mike Y. Sterry',
    avatarUrl: 'https://placehold.co/100x100.png?text=MS',
    dataAiHint: "profile person",
    bio: 'Loves a good whodunit.',
    followersCount: 78,
    followingCount: 2,
    followingIds: ['user3FirebaseUid', 'user1FirebaseUid'],
    role: 'reader',
    email: 'mike.sterry@example.com',
  }
];

// This function should now ideally fetch from Firestore if needed,
// but for collaborator search by username, a mock might still be used if
// direct username querying is complex/not indexed in Firestore.
// For now, it's used by edit-details to mock-find collaborators by username.
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  // Prioritize Firestore if available and feasible for username lookup
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
  } catch (error) {
    console.warn("Firestore lookup for username failed, falling back to placeholder:", error);
  }
  // Fallback to placeholder users if Firestore lookup fails or is not implemented
  return placeholderUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
  } catch (error) {
     console.warn("Firestore lookup for userId failed, falling back to placeholder:", error);
  }
  return placeholderUsers.find(u => u.id === userId);
};


const summarizeUser = (user: User): UserSummary => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName || user.username,
  avatarUrl: user.avatarUrl,
});

// BASE PLACEHOLDER STORIES - These should ideally be loaded from Firestore for a real app.
// For the purpose of this mock, they are static. `placeholderStories` array below will be dynamic
// based on localStorage IF it exists, otherwise it defaults to these.
const basePlaceholderStories: Story[] = [
 {
    id: 'story1',
    title: 'The Last Stargazer',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover sci-fi',
    summary: 'In a galaxy where stars are fading, a lone stargazer seeks the last spark of light. Their journey will uncover ancient secrets and a destiny intertwined with the fate of the cosmos.',
    tags: ['space opera', 'adventure', 'mystery', 'chosen one'],
    chapters: [
      { id: 'c1s1', title: 'The Fading Sky', content: 'The stars were dying. One by one, they flickered out, leaving vast stretches of the cosmos cold and dark. Elara, the last of the Stargazers, watched from her lonely observatory on the edge of the known universe. Her ancestors had charted the heavens for millennia, but now, there was little left to chart.\n\nA faint signal, a whisper across the void, was her only hope. It spoke of a place where the stars still burned bright, a mythical Eden where the First Ones had hidden the source of all light. Most dismissed it as legend, but Elara clung to it. It was the only thread in a tapestry of despair.', order: 1, wordCount: 150, publishedDate: new Date(Date.now() - 86400000 * 7).toISOString(), status: 'Published' },
      { id: 'c1s2', title: 'Whispers of the Void', content: 'Commander REX, a decommissioned war-droid with a penchant for existential poetry, was Elara\'s only companion. "The universe sighs, does it not?" he rumbled one cycle, his optical sensors dim. "Another constellation gone. Soon, only the echoes will remain."\n\nElara ignored him, focusing on the faint signal. It was stronger tonight, pulling her towards an uncharted sector. "Prepare the \'Odyssey\', REX," she commanded. "We\'re going hunting."', order: 2, wordCount: 120, publishedDate: new Date(Date.now() - 86400000 * 6).toISOString(), status: 'Published' },
      { id: 'c1s3', title: 'The Derelict Oracle', content: 'Their journey led them to a derelict space station, an Oracle of a long-dead civilization. Inside, they found cryptic star charts and warnings of a "Great Devourer" that consumed stellar energy. The Oracle hinted that the First Ones had not hidden the light, but protected it from this entity.\n\n"It seems our legend has a villain," REX noted, his processors whirring. Elara felt a chill. This was no longer just a quest for light, but a race against an ancient cosmic horror.', order: 3, wordCount: 160, publishedDate: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'Published' },
      { id: 'c1s4', title: 'Encounter with Jax Nebula', content: 'In the Kepler\'s Remnant nebula, they encountered Jax, a charming rogue and information broker with a ship full of secrets and a smile that could disarm a pulsar. He claimed to know the way to the "Star Forge," the place Elara sought, but his help came at a steep price: a rare artifact her ancestors had left behind.\n\n"Trust is a luxury in these dark times, Stargazer," Jax purred, eyeing the artifact. Elara knew he was dangerous, but he was also her best lead.', order: 4, wordCount: 140, publishedDate: new Date(Date.now() - 86400000 * 4).toISOString(), status: 'Published' },
      { id: 'c1s5', title: 'The Price of Knowledge', content: 'Elara reluctantly agreed to Jax\'s terms. The artifact, a Celestial Compass, was a key to navigating the treacherous currents of the void. As Jax revealed the coordinates to the Star Forge, alarms blared. A massive, shadowy vessel emerged from the nebula – the Great Devourer\'s herald.\n\n"Looks like the party\'s started," Jax quipped, already powering up his weapons. "Hold on tight, Stargazer. This is where the universe gets interesting." The Odyssey, with its unlikely crew, plunged into the heart of the storm.', order: 5, wordCount: 170, publishedDate: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'Published' },
    ],
    rating: 4.8,
    views: 150000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
    language: 'English',
    isMature: false,
    visibility: 'Public',
    collaborators: [],
  },
  // ... other base stories from your original file ...
];

// This `placeholderStories` will be what's used by most of the app if not directly fetching from Firestore.
// It's initialized with localStorage data or defaults to base stories.
// However, components needing real-time data (like edit-details) should fetch directly from Firestore.
export let placeholderStories: Story[] = []; // Will be populated by initializeGlobalStories

// Function to load stories (now just for placeholder/mock purposes, not primary data source)
const loadMockStories = (): Story[] => {
  if (typeof window === 'undefined') {
    return [...basePlaceholderStories].map(story => ({
        language: 'English', isMature: false, visibility: 'Public', collaborators: [], ...story
    }));
  }
  // The localStorage part is mostly for retaining mock data during development if Firestore is not fully used everywhere.
  // For production, Firestore is the source of truth.
  try {
    const storedStoriesString = localStorage.getItem('d4rkv3nom_stories_mock'); // Using a distinct key for mocks
    if (storedStoriesString) {
      const storedStories: Story[] = JSON.parse(storedStoriesString);
      // Simple merge: prioritize localStorage, then add base stories not present in localStorage
      const storyMap = new Map<string, Story>();
      storedStories.forEach(story => storyMap.set(story.id, {...story, language: story.language || 'English', isMature: story.isMature || false, visibility: story.visibility || 'Public', collaborators: story.collaborators || []}));
      basePlaceholderStories.forEach(story => {
          if (!storyMap.has(story.id)) {
              storyMap.set(story.id, {language: 'English', isMature: false, visibility: 'Public', collaborators: [], ...story});
          }
      });
      return Array.from(storyMap.values());
    }
  } catch (error) {
    console.error("Error loading mock stories from localStorage:", error);
  }
   return [...basePlaceholderStories].map(story => ({
        language: 'English', isMature: false, visibility: 'Public', collaborators: [], ...story
    }));
};

// Removed upsertStoryAndSave and deleteStoryAndSave etc. as they should operate on Firestore directly
// in the components (like edit-details page). This file should only manage placeholder data.
// If you need these for parts of the app still relying on mock data, they'd need to be adapted
// to only affect the `placeholderStories` array and localStorage for mocks.

export const initializeUserStoryLists = () => {
  // This function might still be used for populating mock user profiles if needed.
  const currentGlobalStories = placeholderStories; // Uses the locally managed mock story list

  placeholderUsers.forEach(user => {
    user.writtenStories = currentGlobalStories
      .filter(story => story.author.id === user.id)
      .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl, status: story.status }));

    const userWrittenStoryIds = new Set(user.writtenStories.map(s => s.id));
    user.readingList = currentGlobalStories
      .filter(story => !userWrittenStoryIds.has(story.id) && story.status !== 'Draft' && story.visibility === 'Public')
      .sort(() => 0.5 - Math.random())
      .slice(0, 8)
      .map(story => ({
          id: story.id,
          title: story.title,
          coverImageUrl: story.coverImageUrl,
          chapters: story.chapters,
          dataAiHint: story.dataAiHint
      }));
  });
};

// Initialize global stories once
export const initializeGlobalStories = () => {
    placeholderStories = loadMockStories();
    initializeUserStoryLists(); // Initialize user lists based on these mock stories
};
initializeGlobalStories();


export const formatDate = (dateInput?: string | Date | { seconds: number, nanoseconds: number }): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'object' && 'seconds' in dateInput && 'nanoseconds' in dateInput) {
    // Handle Firestore Timestamp object
    date = new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
  } else {
    return 'Invalid Date';
  }

  try {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24 * 7) { 
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e, "Input was:", dateInput);
    return 'Invalid Date';
  }
};

// Placeholder comments, messages, conversations, notifications can remain as they are for mock UI
// unless specific features require them to be Firestore-driven.
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
  // ... other comments
];

export const placeholderMessages: Message[] = [
  {
    id: 'msg1',
    senderId: placeholderUsers.find(u => u.id === 'user1FirebaseUid')!.id,
    content: 'Hey! Loved your latest chapter on "Chronicles of the Shadow Forest". Want to co-author something sometime?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  // ... other messages
];

export const placeholderConversations: Conversation[] = [
  {
    id: 'conv1',
    participantIds: [placeholderUsers.find(u => u.id === 'user1FirebaseUid')!.id, placeholderUsers.find(u => u.id === 'user2FirebaseUid')!.id],
    participantInfo: {
        [placeholderUsers.find(u => u.id === 'user1FirebaseUid')!.id]: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
        [placeholderUsers.find(u => u.id === 'user2FirebaseUid')!.id]: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!)
    },
    lastMessage: {
        id: 'msg2',
        content: 'Thanks so much! That sounds interesting. What did you have in mind?',
        senderId: placeholderUsers.find(u => u.id === 'user2FirebaseUid')!.id,
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  // ... other conversations
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
    // userId: 'user1FirebaseUid' // Example, should be set if this notification is for user1
  },
  // ... other notifications
];
