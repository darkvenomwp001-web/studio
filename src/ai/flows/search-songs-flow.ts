'use server';
/**
 * @fileOverview An AI agent for searching songs.
 *
 * - searchSongs - A function that returns a list of songs based on a query.
 * - SearchSongsInput - The input type for the function.
 * - SearchSongsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SongSchema = z.object({
    id: z.string().describe('The Spotify track ID.'),
    title: z.string().describe('The title of the song.'),
    artist: z.string().describe('The name of the artist.'),
    cover: z.string().describe('The URL of the album cover art.'),
    lyrics: z.array(z.object({
        time: z.number(),
        text: z.string(),
    })).describe('An array of time-stamped lyrics.'),
});

export type Song = z.infer<typeof SongSchema>;

const SearchSongsInputSchema = z.object({
  query: z.string().describe('The search term for songs or artists.'),
});
export type SearchSongsInput = z.infer<typeof SearchSongsInputSchema>;

const SearchSongsOutputSchema = z.object({
  songs: z.array(SongSchema).describe('A list of matching songs.'),
});
export type SearchSongsOutput = z.infer<typeof SearchSongsOutputSchema>;


const mockSongs: Song[] = [
    { 
        id: '4cOdK2wGLETOMsVCDgM5tZ', 
        title: 'drivers license', 
        artist: 'Olivia Rodrigo', 
        cover: 'https://i.scdn.co/image/ab67616d00004851a9792496273434e447545367',
        lyrics: [
            { time: 5, text: "I got my driver's license last week" },
            { time: 8, text: "Just like we always talked about" },
            { time: 11, text: "'Cause you were so excited for me" },
            { time: 14, text: "To finally drive up to your house" },
            { time: 17, text: "But today I drove through the suburbs" },
            { time: 20, text: "Crying 'cause you weren't around" },
        ]
    },
    { 
        id: '1iIhYk1kGat5o3F1Isr6iG', 
        title: 'positions', 
        artist: 'Ariana Grande', 
        cover: 'https://i.scdn.co/image/ab67616d00004851ab2523a6f3b0632617e97f5d',
        lyrics: [
            { time: 3, text: "Heaven sent you to me" },
            { time: 6, text: "I'm just hopin' I don't repeat history" },
            { time: 9, text: "Boy, I'm tryna meet your mama on a Sunday" },
            { time: 12, text: "Then make a lotta love on a Monday" },
        ]
    },
    { 
        id: '5QO79kh1waicV47BqGRL3g', 
        title: 'Save Your Tears', 
        artist: 'The Weeknd', 
        cover: 'https://i.scdn.co/image/ab67616d00004851e33335b868a253381a17b258',
        lyrics: [
            { time: 4, text: "I saw you dancing in a crowded room" },
            { time: 7, text: "You look so happy when I'm not with you" },
            { time: 10, text: "But then you saw me, caught you by surprise" },
            { time: 13, text: "A single teardrop falling from your eye" },
        ]
    },
    { 
        id: '7qEHsqek33rTcFNT9PFqLf', 
        title: 'Blinding Lights', 
        artist: 'The Weeknd', 
        cover: 'https://i.scdn.co/image/ab67616d00004851e33335b868a253381a17b258',
        lyrics: [
            { time: 5, text: "I've been tryna call" },
            { time: 7, text: "I've been on my own for long enough" },
            { time: 10, text: "Maybe you can show me how to love, maybe" },
        ]
    },
    { 
        id: '27OeeYzk6klgBh8ZJvpiMX', 
        title: 'good 4 u', 
        artist: 'Olivia Rodrigo', 
        cover: 'https://i.scdn.co/image/ab67616d00004851a9792496273434e447545367',
        lyrics: [
            { time: 3, text: "Well, good for you, I guess you moved on really easily" },
            { time: 6, text: "You found a new girl and it only took a couple weeks" },
            { time: 9, text: "Remember when you said that you wanted to give me the world?" },
        ]
    },
];

// This is a mock function. In a real application, this would call the Spotify API.
async function performSongSearch(query: string): Promise<Song[]> {
    if (!query.trim()) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    return mockSongs.filter(song =>
        song.title.toLowerCase().includes(lowerCaseQuery) ||
        song.artist.toLowerCase().includes(lowerCaseQuery)
    );
}


export async function searchSongs(input: SearchSongsInput): Promise<SearchSongsOutput> {
  return searchSongsFlow(input);
}

const searchSongsFlow = ai.defineFlow(
  {
    name: 'searchSongsFlow',
    inputSchema: SearchSongsInputSchema,
    outputSchema: SearchSongsOutputSchema,
  },
  async input => {
    const songs = await performSongSearch(input.query);
    return { songs };
  }
);
