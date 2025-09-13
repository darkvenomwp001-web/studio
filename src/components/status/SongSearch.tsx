
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Music, CheckCircle } from 'lucide-react';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';


// Mock data for song search with lyrics
const mockSongs = [
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

type Song = typeof mockSongs[0];

interface SongSearchProps {
    onSongSelect: (song: Song) => void;
    onLyricSelect: (lyric: string | null) => void;
}

export default function SongSearch({ onSongSelect, onLyricSelect }: SongSearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [selectedLyric, setSelectedLyric] = useState<string | null>(null);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }
        const filtered = mockSongs.filter(song =>
            song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered);
    }, [searchTerm]);

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
            <Input
                placeholder="Search for a song or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
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
             {searchTerm && searchResults.length === 0 && !selectedSong && (
                <p className="text-sm text-center text-muted-foreground py-4">No songs found for "{searchTerm}".</p>
            )}
        </div>
    );
}

