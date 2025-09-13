
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Music, CheckCircle, Loader2 } from 'lucide-react';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { Song } from '@/ai/flows/search-songs-flow';
import { searchSongs } from '@/app/actions/aiActions';


// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}


interface SongSearchProps {
    onSongSelect: (song: Song) => void;
    onLyricSelect: (lyric: string | null) => void;
}

export default function SongSearch({ onSongSelect, onLyricSelect }: SongSearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [selectedLyric, setSelectedLyric] = useState<string | null>(null);
    const [isSearching, startSearchTransition] = useTransition();

    const performSearch = async (query: string) => {
        if (query.trim() === '') {
            setSearchResults([]);
            return;
        }
        startSearchTransition(async () => {
            const result = await searchSongs({ query });
            if ('error' in result) {
                // Handle error appropriately, maybe with a toast
                console.error(result.error);
                setSearchResults([]);
            } else {
                setSearchResults(result.songs);
            }
        });
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(debounce(performSearch, 300), []);

    useEffect(() => {
        debouncedSearch(searchTerm);
    }, [searchTerm, debouncedSearch]);

    const handleSelectSong = (song: Song) => {
        setSelectedSong(song);
        onSongSelect(song);
        setSelectedLyric(null);
        onLyricSelect(null);
        setSearchTerm('');
        setSearchResults([]);
    };
    
    const handleSelectLyric = (lyric: string) => {
        if(selectedLyric === lyric) {
            setSelectedLyric(null);
            onLyricSelect(null);
        } else {
            setSelectedLyric(lyric);
            onLyricSelect(lyric);
        }
    };


    return (
        <div className="space-y-4">
            <div className="relative">
                <Input
                    placeholder="Search for a song or artist..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {isSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            {selectedSong && (
                <div className="space-y-3">
                    <SpotifyPlayer trackUrl={`https://open.spotify.com/track/${selectedSong.id}`} />
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Select a lyric snippet (optional)</h4>
                        <ScrollArea className="h-40 border rounded-md">
                             <div className="p-2 space-y-1">
                                {selectedSong.lyrics.map((lyric, index) => (
                                    <button 
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelectLyric(lyric.text)}
                                        className={cn(
                                            "w-full text-left p-2 rounded-md text-sm transition-colors",
                                            selectedLyric === lyric.text ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                        )}
                                    >
                                        {lyric.text}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
            
            {searchResults.length > 0 && !selectedSong && (
                 <ScrollArea className="h-60">
                    <div className="space-y-2 pr-4">
                        {searchResults.map(song => (
                            <div
                                key={song.id}
                                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted"
                                onClick={() => handleSelectSong(song)}
                            >
                                <Image src={song.cover} alt={song.title} width={40} height={40} className="rounded-sm" />
                                <div className="flex-1">
                                    <p className="font-semibold text-sm truncate">{song.title}</p>
                                    <p className="text-xs text-muted-foreground">{song.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </ScrollArea>
            )}
             {searchTerm && searchResults.length === 0 && !selectedSong && !isSearching && (
                <p className="text-sm text-center text-muted-foreground py-4">No songs found for "{searchTerm}".</p>
            )}
        </div>
    );
}
