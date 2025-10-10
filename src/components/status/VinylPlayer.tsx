
'use client';

import Image from 'next/image';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VinylPlayerProps {
    albumArtUrl?: string | null;
    isPlaying?: boolean;
}

export default function VinylPlayer({ albumArtUrl, isPlaying = true }: VinylPlayerProps) {
    return (
        <div className="relative w-48 h-48 md:w-56 md:h-56">
            {/* Vinyl Record */}
            <div
                className={cn(
                    'absolute inset-0 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-700 shadow-lg',
                    isPlaying && 'animate-spin'
                )}
                style={{ animationDuration: '3s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
            >
                {/* Grooves */}
                <div className="absolute inset-2 border-[1.5px] border-gray-600/50 rounded-full"></div>
                <div className="absolute inset-4 border-[1px] border-gray-700/50 rounded-full"></div>
                <div className="absolute inset-6 border-[1.5px] border-gray-600/50 rounded-full"></div>
                <div className="absolute inset-10 border-[1px] border-gray-700/50 rounded-full"></div>
                <div className="absolute inset-12 border-[1.5px] border-gray-600/50 rounded-full"></div>
                <div className="absolute inset-16 border-[1px] border-gray-700/50 rounded-full"></div>

                {/* Center Label */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-inner bg-gray-500">
                    {albumArtUrl ? (
                         <Image src={albumArtUrl} layout="fill" objectFit="cover" alt="Album Art" />
                    ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-300">
                            <Music2 className="w-8 h-8 text-gray-500" />
                        </div>
                    )}
                </div>
                {/* Spindle hole */}
                <div className="absolute w-2 h-2 bg-gray-900 rounded-full border border-gray-500"></div>
            </div>
             {/* Tonearm */}
             <div className="absolute -right-8 -top-8 w-24 h-24 origin-bottom-left transition-transform duration-500"
                style={{ transform: isPlaying ? 'rotate(25deg)' : 'rotate(0deg)'}}
             >
                <div className="w-2 h-16 bg-gray-300 rounded-sm absolute bottom-0 left-0 -rotate-12 origin-bottom-left shadow-md">
                     <div className="w-4 h-4 bg-gray-400 rounded-full absolute -top-1 -left-1"></div>
                </div>
             </div>
        </div>
    );
}

