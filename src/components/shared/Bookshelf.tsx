
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BookMarked, Users, Wand2, Star } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import type { Story, UserSummary } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

function BookshelfSkeleton() {
    return (
        <Card className="bg-muted/30 p-6">
            <div className="space-y-8">
                <div>
                    <Skeleton className="h-8 w-1/2 mb-4" />
                    <div className="flex space-x-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-36 md:w-40">
                                <Skeleton className="aspect-[2/3] w-full rounded-md" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                 </div>
            </div>
        </Card>
    )
}


export default function Bookshelf() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [themedStories, setThemedStories] = useState<Story[]>([]);
    const [friendsPick, setFriendsPick] = useState<Story | null>(null);
    const [mockFriend, setMockFriend] = useState<UserSummary | null>(null);

    useEffect(() => {
        const storiesCol = collection(db, 'stories');

        // Listener for themed stories ("Shelf of the Day")
        const themedQuery = query(
            storiesCol,
            where('visibility', '==', 'Public'),
            where('genre', '==', 'Fantasy'), // Theme: Fantasy
            orderBy('lastUpdated', 'desc'),
            limit(10)
        );
        const unsubscribeThemed = onSnapshot(themedQuery, (snapshot) => {
            const themedList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
            setThemedStories(themedList);
            setIsLoading(false); // Set loading to false on first data fetch
        }, (error) => {
            console.error("Error fetching themed stories:", error);
            setIsLoading(false);
        });

        // Listener for "Friend's Pick" - pick the most viewed highly-rated story
        const friendsPickQuery = query(
            storiesCol,
            where('visibility', '==', 'Public'),
            where('rating', '>=', 4),
            orderBy('rating', 'desc'),
            orderBy('views', 'desc'),
            limit(1)
        );
        const unsubscribeFriendsPick = onSnapshot(friendsPickQuery, (snapshot) => {
            if (!snapshot.empty) {
                const pick = { id: snapshot.docs[0].id, ...snapshot.docs[0].data()} as Story;
                setFriendsPick(pick);
                setMockFriend({
                    id: 'mock_friend_id',
                    username: 'a_fellow_reader',
                    displayName: 'A Fellow Reader',
                    avatarUrl: `https://picsum.photos/seed/friend/100/100`
                });
            }
        }, (error) => {
            console.error("Error fetching friend's pick:", error);
        });

        return () => {
            unsubscribeThemed();
            unsubscribeFriendsPick();
        };
    }, []);

    if (isLoading) {
        return <BookshelfSkeleton />;
    }

    return (
        <Card className="bg-card p-4 md:p-6 shadow-inner border-border/50">
            <CardHeader className="p-2 text-center">
                 <CardTitle className="text-3xl font-headline font-bold text-primary flex items-center justify-center gap-3">
                    <BookMarked className="h-8 w-8" />
                    The Community Bookshelf
                </CardTitle>
                <CardDescription>Discover stories curated by the community and our AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-12 mt-4">
                {/* Feature 1: Shelf of the Day */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Wand2 className="h-6 w-6 text-accent"/>
                        <h3 className="text-2xl font-headline font-semibold">Today's Shelf: Epic Fantasy</h3>
                    </div>
                    {themedStories.length > 0 ? (
                        <ScrollArea className="w-full whitespace-nowrap rounded-md">
                            <div className="flex space-x-4 pb-4">
                                {themedStories.map(story => (
                                    <CompactStoryCard key={`themed-${story.id}`} story={story} />
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-sm">Today's shelf is empty. Check back soon!</p>
                    )}
                </section>

                 {/* Feature 2: Friend's Picks */}
                 {friendsPick && mockFriend && (
                    <section>
                         <div className="flex items-center gap-2 mb-4">
                            <Users className="h-6 w-6 text-accent"/>
                            <h3 className="text-2xl font-headline font-semibold">Spotted on a Friend's Shelf</h3>
                        </div>
                        <Card className="w-full overflow-hidden shadow-lg hover:shadow-primary/20 transition-all duration-300 group bg-muted/30">
                            <div className="md:flex">
                                <div className="md:flex-shrink-0 md:w-1/3 relative aspect-[2/3]">
                                    <Image
                                    src={friendsPick.coverImageUrl || `https://picsum.photos/seed/${friendsPick.id}/512/800`}
                                    alt={friendsPick.title}
                                    layout="fill"
                                    objectFit="cover"
                                    className="group-hover:scale-105 transition-transform duration-500"
                                    data-ai-hint={friendsPick.dataAiHint || "book cover adventure"}
                                    />
                                </div>
                                <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
                                    <div>
                                        <CardDescription className="text-sm text-muted-foreground mb-3">
                                            <span className="font-medium">{mockFriend.displayName}</span> just added this to their library!
                                        </CardDescription>
                                        <CardTitle className="text-2xl font-headline group-hover:text-primary transition-colors">{friendsPick.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            By <Link href={`/profile/${friendsPick.author.id}`} className="hover:underline font-medium">{friendsPick.author.displayName || friendsPick.author.username}</Link>
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="bg-accent text-accent-foreground">{friendsPick.genre}</Badge>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Rating">
                                                <Star className="w-4 h-4 text-yellow-500" />
                                                <span>{friendsPick.rating?.toFixed(1) || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <CardFooter className="p-0 mt-4">
                                        <Link href={`/stories/${friendsPick.id}`} passHref className="w-full sm:w-auto">
                                            <Button className="w-full sm:w-auto">Check it out</Button>
                                        </Link>
                                    </CardFooter>
                                </div>
                            </div>
                        </Card>
                    </section>
                 )}

            </CardContent>
        </Card>
    );
}
