
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Music, CheckCircle, Loader2 } from 'lucide-react';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { Song } from '@/types';
import { searchSongs } from '@/app/actions/aiActions';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '../ui/carousel';


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

export function LyricCarousel({ lyrics, onSelectLyric, selectedLyric }: { lyrics: Song['lyrics'], onSelectLyric: (lyric: string | null) => void, selectedLyric: string | null }) {
    const [api, setApi] = useState<CarouselApi>()
 
    useEffect(() => {
      if (!api) {
        return
      }
   
      const handleSelect = () => {
        const selected = lyrics[api.selectedScrollSnap()];
        onSelectLyric(selected.text);
      }
      
      api.on("select", handleSelect)
      // Set initial lyric
      handleSelect();
   
      return () => {
        api.off("select", handleSelect)
      }
    }, [api, lyrics, onSelectLyric])

    return (
        <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
            <CarouselContent>
                {lyrics.map((lyric, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1">
                            <p className="text-center text-lg italic text-white/90">"{lyric.text}"</p>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}

interface SongSearchProps {
    onSongSelect: (song: Song | null) => void;
}

export default function SongSearch({ onSongSelect }: SongSearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [isSearching, startSearchTransition] = useTransition();

    const performSearch = async (query: string) => {
        if (query.trim() === '') {
            setSearchResults([]);
            return;
        }
        startSearchTransition(async () => {
            const result = await searchSongs({ query });
            if ('error' in result) {
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
        onSongSelect(song);
        setSearchTerm('');
        setSearchResults([]);
    };


    return (
        <div className="space-y-4">
            <div className="relative">
                <Input
                    placeholder="Search for a song or artist..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {isSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-white/70" />}
            </div>
            
            {searchResults.length > 0 && (
                 <ScrollArea className="h-60">
                    <div className="space-y-2 pr-4">
                        {searchResults.map(song => (
                            <div
                                key={song.id}
                                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/10"
                                onClick={() => handleSelectSong(song)}
                            >
                                <Image src={song.cover} alt={song.title} width={40} height={40} className="rounded-sm" />
                                <div className="flex-1">
                                    <p className="font-semibold text-sm truncate text-white">{song.title}</p>
                                    <p className="text-xs text-white/70">{song.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </ScrollArea>
            )}
             {searchTerm && searchResults.length === 0 && !isSearching && (
                <p className="text-sm text-center text-white/70 py-4">No songs found for "{searchTerm}".</p>
            )}
        </div>
    );
}
