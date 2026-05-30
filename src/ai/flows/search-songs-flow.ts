'use server';
/**
 * @fileOverview An AI agent for searching songs using the iTunes Search API (Free, Real-time).
 *
 * - searchSongs - A function that returns a list of songs based on a query.
 * - SearchSongsInput - The input type for the function.
 * - SearchSongsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SongSchema = z.object({
    id: z.string().describe('The track ID.'),
    title: z.string().describe('The title of the song.'),
    artist: z.string().describe('The name of the artist.'),
    cover: z.string().describe('The URL of the album cover art.'),
    previewUrl: z.string().optional().describe('URL to a 30s audio preview.'),
    source: z.enum(['spotify', 'itunes']).default('itunes').describe('Source of the track.'),
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

/**
 * Searches for songs using the iTunes Search API.
 * This is a free, real-time API providing a massive catalog of old and new releases.
 */
async function performMusicSearch(query: string): Promise<Song[]> {
    if (!query.trim()) {
        return [];
    }
    
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Music network failure');
        
        const data = await response.json();
        
        return data.results.map((item: any) => ({
            id: String(item.trackId),
            title: item.trackName,
            artist: item.artistName,
            // Upgrade artwork resolution for high-fidelity displays
            cover: item.artworkUrl100.replace('100x100bb', '600x600bb'),
            previewUrl: item.previewUrl,
            source: 'itunes',
            lyrics: [
                { time: 5, text: `🎵 Listening to ${item.trackName}` },
                { time: 10, text: `by ${item.artistName}` },
                { time: 15, text: `Shared via D4RKV3NOM Studio.` }
            ]
        }));
    } catch (error) {
        console.error("Music Search Service Failure:", error);
        return [];
    }
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
    const songs = await performMusicSearch(input.query);
    return { songs };
  }
);
