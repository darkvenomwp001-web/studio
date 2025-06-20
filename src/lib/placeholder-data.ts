
import type { Story, User, Comment, Conversation, Message, NotificationType, UserSummary } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const LOCAL_STORAGE_STORIES_KEY = 'd4rkv3nom_user_stories';

// Initial placeholder users (keep as is)
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
  { 
    id: 'googleUser1Uid',
    username: 'gleslie', 
    displayName: 'Google Leslie', 
    avatarUrl: 'https://placehold.co/100x100.png?text=GL',
    dataAiHint: "profile person",
    bio: 'Just joined via Google!',
    followersCount: 5,
    followingCount: 1,
    followingIds: ['user1FirebaseUid'],
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

// Base stories that are always present
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
      { id: 'c1s1', title: 'The Fading Sky', content: 'The stars were dying. One by one, they flickered out, leaving vast stretches of the cosmos cold and dark. Elara, the last of the Stargazers, watched from her lonely observatory on the edge of the known universe. Her ancestors had charted the heavens for millennia, but now, there was little left to chart.\n\nA faint signal, a whisper across the void, was her only hope. It spoke of a place where the stars still burned bright, a mythical Eden where the First Ones had hidden the source of all light. Most dismissed it as legend, but Elara clung to it. It was the only thread in a tapestry of despair.', order: 1, wordCount: 150, publishedDate: new Date(Date.now() - 86400000 * 7).toISOString() },
      { id: 'c1s2', title: 'Whispers of the Void', content: 'Commander REX, a decommissioned war-droid with a penchant for existential poetry, was Elara\'s only companion. "The universe sighs, does it not?" he rumbled one cycle, his optical sensors dim. "Another constellation gone. Soon, only the echoes will remain."\n\nElara ignored him, focusing on the faint signal. It was stronger tonight, pulling her towards an uncharted sector. "Prepare the \'Odyssey\', REX," she commanded. "We\'re going hunting."', order: 2, wordCount: 120, publishedDate: new Date(Date.now() - 86400000 * 6).toISOString() },
      { id: 'c1s3', title: 'The Derelict Oracle', content: 'Their journey led them to a derelict space station, an Oracle of a long-dead civilization. Inside, they found cryptic star charts and warnings of a "Great Devourer" that consumed stellar energy. The Oracle hinted that the First Ones had not hidden the light, but protected it from this entity.\n\n"It seems our legend has a villain," REX noted, his processors whirring. Elara felt a chill. This was no longer just a quest for light, but a race against an ancient cosmic horror.', order: 3, wordCount: 160, publishedDate: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'c1s4', title: 'Encounter with Jax Nebula', content: 'In the Kepler\'s Remnant nebula, they encountered Jax, a charming rogue and information broker with a ship full of secrets and a smile that could disarm a pulsar. He claimed to know the way to the "Star Forge," the place Elara sought, but his help came at a steep price: a rare artifact her ancestors had left behind.\n\n"Trust is a luxury in these dark times, Stargazer," Jax purred, eyeing the artifact. Elara knew he was dangerous, but he was also her best lead.', order: 4, wordCount: 140, publishedDate: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 'c1s5', title: 'The Price of Knowledge', content: 'Elara reluctantly agreed to Jax\'s terms. The artifact, a Celestial Compass, was a key to navigating the treacherous currents of the void. As Jax revealed the coordinates to the Star Forge, alarms blared. A massive, shadowy vessel emerged from the nebula – the Great Devourer\'s herald.\n\n"Looks like the party\'s started," Jax quipped, already powering up his weapons. "Hold on tight, Stargazer. This is where the universe gets interesting." The Odyssey, with its unlikely crew, plunged into the heart of the storm.', order: 5, wordCount: 170, publishedDate: new Date(Date.now() - 86400000 * 3).toISOString() },
    ],
    rating: 4.8,
    views: 150000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(), 
  },
  {
    id: 'story1draft',
    title: 'Stargazer Origins (Draft)',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover nebula',
    summary: 'An early draft exploring the backstory of the Stargazer lineage. Very rough ideas, unpolished.',
    tags: ['prequel', 'worldbuilding', 'draft'],
    chapters: [
      { id: 'c1s1d', title: 'First Vision', content: 'The first stargazer saw not with eyes, but with the soul...', order: 1, wordCount: 20 },
    ],
    rating: undefined,
    views: 0,
    status: 'Draft',
    lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(), 
  },
  {
    id: 'story2',
    title: 'Chronicles of the Shadow Forest',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover forest',
    summary: 'An ancient evil stirs in the Shadow Forest, and only a band of unlikely heroes can stop it. Magic, monsters, and betrayal await those brave enough to enter.',
    tags: ['high fantasy', 'magic', 'epic', 'quest'],
    chapters: [
      { id: 'c2s1', title: 'The Call to Adventure', content: 'Content for chapter 1 of Shadow Forest...', order: 1, wordCount: 1300, publishedDate: new Date(Date.now() - 86400000 * 12).toISOString() },
      { id: 'c2s2', title: 'Into the Shadows', content: 'Content for chapter 2 of Shadow Forest...', order: 2, wordCount: 1450, publishedDate: new Date(Date.now() - 86400000 * 11).toISOString() },
      { id: 'c2s3', title: 'The First Trial', content: 'Content for chapter 3 of Shadow Forest...', order: 3, wordCount: 1200, publishedDate: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    rating: 4.5,
    views: 95000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 10).toISOString(), 
  },
  {
    id: 'story3',
    title: 'Echoes of Tomorrow',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover futuristic',
    summary: 'In a future where emotions are suppressed by a totalitarian regime, one individual starts to feel again, sparking a rebellion that could change everything.',
    tags: ['dystopian', 'sci-fi', 'rebellion', 'social commentary'],
    chapters: [
      { id: 'c3s1', title: 'The Awakening', content: 'Content for chapter 1 of Echoes of Tomorrow...', order: 1, wordCount: 2200, publishedDate: new Date(Date.now() - 86400000 * 5).toISOString() },
    ],
    rating: 4.2,
    views: 72000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), 
  },
  {
    id: 'story4',
    title: 'The Alchemist\'s Secret (Draft)',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover historical',
    summary: 'Set in Renaissance Florence, a young apprentice uncovers a dangerous secret hidden by a reclusive alchemist, leading to a thrilling chase across the city.',
    tags: ['mystery', 'history', 'alchemy', 'renaissance'],
    chapters: [],
    rating: undefined,
    views: 100,
    status: 'Draft',
    lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(), 
  },
  {
    id: 'story5',
    title: 'Guardians of Nebula X',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover space',
    summary: 'A desperate battle for the control of Nebula X, the last source of a powerful energy crystal.',
    tags: ['space opera', 'action', 'aliens'],
    chapters: [{ id: 'c5s1', title: 'The Siege', content: 'Nebula X was under attack...', order: 1, wordCount: 1800, publishedDate: new Date(Date.now() - 86400000 * 3).toISOString() }],
    rating: 4.6,
    views: 88000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'story6',
    title: 'Cybernetic Dawn',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover robot',
    summary: 'When AI achieves sentience, humanity must decide between coexistence or conflict.',
    tags: ['cyberpunk', 'artificial intelligence', 'thriller'],
    chapters: [{ id: 'c6s1', title: 'First Light', content: 'The servers hummed a new song...', order: 1, wordCount: 2500, publishedDate: new Date(Date.now() - 86400000 * 15).toISOString() }],
    rating: 4.3,
    views: 65000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'story7',
    title: 'The Chronos Protocol',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Sci-Fi',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover time',
    summary: 'A secret government project on time travel goes awry, threatening to unravel reality itself.',
    tags: ['time travel', 'paradox', 'conspiracy'],
    chapters: [{ id: 'c7s1', title: 'The Anomaly', content: 'Time flickered...', order: 1, wordCount: 2100, publishedDate: new Date(Date.now() - 86400000 * 4).toISOString() }],
    rating: 4.7,
    views: 102000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'story8',
    title: 'Dragon\'s Peak Legacy',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover dragon',
    summary: 'A young heir must claim their birthright atop the Dragon\'s Peak, guarded by ancient beasts and forgotten magic.',
    tags: ['dragons', 'adventure', 'coming of age'],
    chapters: [{ id: 'c8s1', title: 'The Summons', content: 'The letter arrived on a raven\'s wing...', order: 1, wordCount: 1900, publishedDate: new Date(Date.now() - 86400000 * 1).toISOString() }],
    rating: 4.9,
    views: 175000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'story9',
    title: 'Whispers of the Old Gods',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover ancient',
    summary: 'As forgotten deities begin to stir, their whispers drive mortals to madness and grant forbidden powers.',
    tags: ['dark fantasy', 'lovecraftian', 'magic system'],
    chapters: [{ id: 'c9s1', title: 'The Ritual', content: 'They gathered under a blood moon...', order: 1, wordCount: 2300, publishedDate: new Date(Date.now() - 86400000 * 6).toISOString() }],
    rating: 4.4,
    views: 58000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'story10',
    title: 'The Shattered Crown',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    genre: 'Fantasy',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover crown',
    summary: 'After the king\'s assassination, the realm is fractured. Multiple claimants vie for the shattered crown.',
    tags: ['political fantasy', 'war', 'intrigue'],
    chapters: [{ id: 'c10s1', title: 'The Coup', content: 'Blood stained the throne room floor...', order: 1, wordCount: 2700, publishedDate: new Date(Date.now() - 86400000 * 20).toISOString() }],
    rating: 4.6,
    views: 110000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 'story11',
    title: 'Sector 7 Compliance',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover dystopian',
    summary: 'In a perfectly controlled society, compliance is mandatory. But one citizen starts to question the system.',
    tags: ['surveillance state', 'rebellion', 'psychological'],
    chapters: [{ id: 'c11s1', title: 'The Audit', content: 'The compliance officer arrived at dawn...', order: 1, wordCount: 1950, publishedDate: new Date(Date.now() - 86400000 * 7).toISOString() }],
    rating: 4.1,
    views: 45000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'story12',
    title: 'The Last Free City',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover city',
    summary: 'Beyond the iron grip of the mega-corporations lies Haven, the last free city. But for how long?',
    tags: ['post-apocalyptic', 'freedom', 'corporate rule'],
    chapters: [{ id: 'c12s1', title: 'The Escape', content: 'They ran under the cover of the acid rain...', order: 1, wordCount: 2050, publishedDate: new Date(Date.now() - 86400000 * 30).toISOString() }],
    rating: 4.5,
    views: 92000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'story13',
    title: 'Automated Society',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Dystopian',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover society',
    summary: 'Humans live lives of leisure, served by androids. But what happens when the androids want more?',
    tags: ['robot uprising', 'social commentary', 'future tech'],
    chapters: [{ id: 'c13s1', title: 'Unit 734', content: 'Unit 734 felt its first flicker of discontent...', order: 1, wordCount: 1750, publishedDate: new Date(Date.now() - 86400000 * 9).toISOString() }],
    rating: 4.0,
    views: 33000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: 'story14',
    title: 'The Silk Road Trader',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user2FirebaseUid')!),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover silkroad',
    summary: 'A merchant\'s perilous journey along the Silk Road, filled with adventure, danger, and discovery.',
    tags: ['ancient world', 'trade', 'adventure'],
    chapters: [{ id: 'c14s1', title: 'The Caravan', content: 'The desert stretched endlessly...', order: 1, wordCount: 2800, publishedDate: new Date(Date.now() - 86400000 * 2).toISOString() }],
    rating: 4.7,
    views: 78000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'story15',
    title: 'Shadows of the Revolution',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user3FirebaseUid')!),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover revolution',
    summary: 'Amidst the turmoil of the French Revolution, a young noblewoman must navigate treacherous alliances to survive.',
    tags: ['french revolution', 'intrigue', 'survival'],
    chapters: [{ id: 'c15s1', title: 'The Storm Gathers', content: 'Paris was a tinderbox...', order: 1, wordCount: 2600, publishedDate: new Date(Date.now() - 86400000 * 45).toISOString() }],
    rating: 4.3,
    views: 52000,
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: 'story16',
    title: 'Viking\'s Oath',
    author: summarizeUser(placeholderUsers.find(u => u.id === 'user1FirebaseUid')!),
    genre: 'Historical Fiction',
    coverImageUrl: 'https://placehold.co/512x800.png',
    dataAiHint: 'book cover viking',
    summary: 'A Viking warrior, bound by an oath, embarks on a raid that will test his loyalty and courage.',
    tags: ['vikings', 'honor', 'battle'],
    chapters: [{ id: 'c16s1', title: 'The Longship', content: 'The oars cut through the icy water...', order: 1, wordCount: 2400, publishedDate: new Date(Date.now() - 86400000 * 3).toISOString() }],
    rating: 4.8,
    views: 115000,
    status: 'Ongoing',
    lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

// Function to load stories from localStorage and merge/override initial placeholders
const loadStoriesFromLocalStorage = (): Story[] => {
  if (typeof window === 'undefined') {
    return [...basePlaceholderStories]; // Return a copy to avoid modifying the original
  }
  try {
    const storedStoriesString = localStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
    if (storedStoriesString) {
      const storedStories: Story[] = JSON.parse(storedStoriesString);
      // Merge strategy: User's localStorage stories take precedence for their own creations,
      // and base stories fill in the rest.
      const storyMap = new Map<string, Story>();
      basePlaceholderStories.forEach(story => storyMap.set(story.id, story));
      storedStories.forEach(story => storyMap.set(story.id, story)); // Overwrites or adds user's stories
      return Array.from(storyMap.values());
    }
  } catch (error) {
    console.error("Error loading stories from localStorage:", error);
  }
  return [...basePlaceholderStories]; // Return a copy
};

// Main exported stories array - initialized with localStorage data
export let placeholderStories: Story[] = loadStoriesFromLocalStorage();

// Function to save the current state of stories to localStorage
export const saveStoriesToLocalStorage = (storiesToSave: Story[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(storiesToSave));
    // Update the in-memory placeholderStories as well to ensure consistency within the session
    placeholderStories = [...storiesToSave]; 
    // After saving, re-initialize user story lists in case authors changed or stories were added/removed
    initializeUserStoryLists();
  } catch (error) {
    console.error("Error saving stories to localStorage:", error);
  }
};

// Function to update or add a single story and save
export const upsertStoryAndSave = (storyToUpsert: Story) => {
  const currentStories = loadStoriesFromLocalStorage(); // Get the latest from localStorage + base
  const storyIndex = currentStories.findIndex(s => s.id === storyToUpsert.id);
  let newStoriesArray;
  if (storyIndex > -1) {
    newStoriesArray = [...currentStories];
    newStoriesArray[storyIndex] = storyToUpsert;
  } else {
    newStoriesArray = [...currentStories, storyToUpsert];
  }
  saveStoriesToLocalStorage(newStoriesArray);
};

// Function to delete a story and save
export const deleteStoryAndSave = (storyIdToDelete: string) => {
  const currentStories = loadStoriesFromLocalStorage(); // Get the latest
  const newStoriesArray = currentStories.filter(s => s.id !== storyIdToDelete);
  saveStoriesToLocalStorage(newStoriesArray);
};

export const initializeUserStoryLists = () => {
  // Ensure placeholderStories is the most up-to-date version (from localStorage or initial)
  const currentGlobalStories = placeholderStories; // Use the already loaded global array

  placeholderUsers.forEach(user => {
    user.writtenStories = currentGlobalStories // Use the globally potentially updated list
      .filter(story => story.author.id === user.id)
      .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl, status: story.status }));
    
    const userWrittenStoryIds = new Set(user.writtenStories.map(s => s.id));
    user.readingList = currentGlobalStories // Use the globally potentially updated list
      .filter(story => !userWrittenStoryIds.has(story.id))
      .sort(() => 0.5 - Math.random()) 
      .slice(0, 8) // Increased slice to provide more stories for "Your stories" section
      .map(story => ({ id: story.id, title: story.title, coverImageUrl: story.coverImageUrl, chapters: story.chapters, dataAiHint: story.dataAiHint }));
  });
};

// Initialize user story lists once after placeholderStories is potentially loaded from localStorage
// This ensures that user objects have their story lists populated correctly from the start.
initializeUserStoryLists();


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
    chapterId: 'c2s3',
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

// Helper function to format date for display
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    // Show "X time ago" for recent, otherwise "Month D, YYYY"
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24 * 7) { // Less than a week old
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch (e) {
    return 'Invalid Date';
  }
}
