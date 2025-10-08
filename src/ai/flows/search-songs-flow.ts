
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
    // Olivia Rodrigo
    { 
        id: '4cOdK2wGLETOMsVCDgM5tZ', 
        title: 'drivers license', 
        artist: 'Olivia Rodrigo', 
        cover: 'https://i.scdn.co/image/ab67616d00004851a9792496273434e447545367',
        lyrics: [ { time: 5, text: "I got my driver's license last week" }, { time: 8, text: "Just like we always talked about" } ]
    },
    { 
        id: '27OeeYzk6klgBh8ZJvpiMX', 
        title: 'good 4 u', 
        artist: 'Olivia Rodrigo', 
        cover: 'https://i.scdn.co/image/ab67616d00004851a9792496273434e447545367',
        lyrics: [ { time: 3, text: "Well, good for you, I guess you moved on really easily" }, { time: 6, text: "You found a new girl and it only took a couple weeks" } ]
    },
    // Ariana Grande
    { 
        id: '1iIhYk1kGat5o3F1Isr6iG', 
        title: 'positions', 
        artist: 'Ariana Grande', 
        cover: 'https://i.scdn.co/image/ab67616d00004851ab2523a6f3b0632617e97f5d',
        lyrics: [ { time: 3, text: "Heaven sent you to me" }, { time: 6, text: "I'm just hopin' I don't repeat history" } ]
    },
    // The Weeknd
    { 
        id: '5QO79kh1waicV47BqGRL3g', 
        title: 'Save Your Tears', 
        artist: 'The Weeknd', 
        cover: 'https://i.scdn.co/image/ab67616d00004851e33335b868a253381a17b258',
        lyrics: [ { time: 4, text: "I saw you dancing in a crowded room" }, { time: 7, text: "You look so happy when I'm not with you" } ]
    },
    { 
        id: '7qEHsqek33rTcFNT9PFqLf', 
        title: 'Blinding Lights', 
        artist: 'The Weeknd', 
        cover: 'https://i.scdn.co/image/ab67616d00004851e33335b868a253381a17b258',
        lyrics: [ { time: 5, text: "I've been tryna call" }, { time: 7, text: "I've been on my own for long enough" } ]
    },
    // Taylor Swift
    {
        id: '1dGr1c8CrMLDpV6mPbImSI',
        title: 'Blank Space',
        artist: 'Taylor Swift',
        cover: 'https://i.scdn.co/image/ab67616d0000b27352b2339e93f694a4ae948194',
        lyrics: [ { time: 4, text: 'Nice to meet you, where you been?' }, { time: 7, text: 'I could show you incredible things' } ]
    },
    {
        id: '0sY6uRvQaAJo4pZ4vYp2dJ',
        title: 'cardigan',
        artist: 'Taylor Swift',
        cover: 'https://i.scdn.co/image/ab67616d0000b27351c02e9551a3139396162338',
        lyrics: [ { time: 3, text: 'Vintage tee, brand new phone' }, { time: 6, text: 'High heels on cobblestones' } ]
    },
    // Billie Eilish
    {
        id: '2Fxmhks0bxGSBdJ92vM42m',
        title: 'bad guy',
        artist: 'Billie Eilish',
        cover: 'https://i.scdn.co/image/ab67616d0000b27350a3143b4241943558642358',
        lyrics: [ { time: 5, text: 'White shirt now red, my bloody nose' }, { time: 8, text: "Sleepin', you're on your tippy toes" } ]
    },
    // Drake
    {
        id: '3S7HDdeJ2vKzR6bQ1s1TzI',
        title: 'God\'s Plan',
        artist: 'Drake',
        cover: 'https://i.scdn.co/image/ab67616d0000b273e920399355608825a1562b71',
        lyrics: [ { time: 5, text: "I've been movin' calm, don't start no trouble with me" }, { time: 8, text: 'Tryna keep it peaceful is a struggle for me' } ]
    },
    // Dua Lipa
    {
        id: '2tnVG71enUj33Ic2nFN6kZ',
        title: 'Don\'t Start Now',
        artist: 'Dua Lipa',
        cover: 'https://i.scdn.co/image/ab67616d0000b27344a065613894451241578673',
        lyrics: [ { time: 3, text: "If you don't wanna see me dancin' with somebody" }, { time: 6, text: 'If you wanna believe that anything could stop me' } ]
    },
    // Harry Styles
    {
        id: '6UelLqGlWMcVH1E5c4H7lY',
        title: 'As It Was',
        artist: 'Harry Styles',
        cover: 'https://i.scdn.co/image/ab67616d0000b273b46f740976543e3a736944c6',
        lyrics: [ { time: 4, text: "Holdin' me back, gravity's holdin' me back" }, { time: 7, text: "I want you to hold out the palm of your hand" } ]
    },
     // Sabrina Carpenter
    {
        id: '2nAivxxL2TH24w7sQ1s033',
        title: 'Please Please Please',
        artist: 'Sabrina Carpenter',
        cover: 'https://i.scdn.co/image/ab67616d0000b2735706a4249a33b3a6a93540a0',
        lyrics: [ { time: 5, text: "I heard that you're an actor, so act like a stand-up guy" }, { time: 8, text: "Whatever devil's inside you, don't let him out tonight" } ]
    },
    {
        id: '3rU32Lg2lRm3p7iGed47nZ',
        title: 'Espresso',
        artist: 'Sabrina Carpenter',
        cover: 'https://i.scdn.co/image/ab67616d0000b2735706a4249a33b3a6a93540a0',
        lyrics: [ { time: 3, text: 'Now he\'s thinkin\' \'bout me every night, oh' }, { time: 6, text: 'Is it that sweet? I guess so' } ]
    },
    // Post Malone
    {
        id: '0e7ipj03S05BNilyu5bRzt',
        title: 'Circles',
        artist: 'Post Malone',
        cover: 'https://i.scdn.co/image/ab67616d0000b2739478c87599550dd73bfa7e02',
        lyrics: [ { time: 4, text: 'We couldn\'t turn around \'til we were upside down' }, { time: 8, text: 'I\'ll be the bad guy now, but know I ain\'t too proud' } ]
    },
     // Kendrick Lamar
    {
        id: '6AI3ezQ4o3HUoP6Dhudph3',
        title: 'Not Like Us',
        artist: 'Kendrick Lamar',
        cover: 'https://i.scdn.co/image/ab67616d0000b2733ea79c1313835677a285098a',
        lyrics: [ { time: 3, text: 'They not like us, they not like us, they not like us' }, { time: 6, text: 'I\'m a walkin\', livin\', breathin\', GOD-body, you know who I am' } ]
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
