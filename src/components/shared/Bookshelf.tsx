
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BookMarked, Users, Wand2, Star, Flame, Calendar, TrendingUp, BookHeart } from 'lucide-react';
import YourStoryCard from '@/components/shared/YourStoryCard';
import type { Story, UserSummary, ReadingListItem } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

function ReadingNookSkeleton() {
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
    const [friendsActivity, setFriendsActivity] = useState<{user: UserSummary, story: ReadingListItem}[]>([]);
    const [readingGoal, setReadingGoal] = useState(30); // Default 30 mins
    const [readingStreak, setReadingStreak] = useState(0); // Mock
    const [todayProgress, setTodayProgress] = useState(0); // Mock

    useEffect(() => {
        // Mock friends activity
        const mockActivity: {user: UserSummary, story: ReadingListItem}[] = user?.readingList?.slice(0, 3).map(story => ({
             user: {
                id: 'mock_friend_id',
                username: 'a_fellow_reader',
                displayName: 'A Fellow Reader',
                avatarUrl: `https://picsum.photos/seed/friend/100/100`
            },
            story: story
        })) || [];
        setFriendsActivity(mockActivity);

        // Mock reading streak and progress
        setReadingStreak(Math.floor(Math.random() * 20));
        setTodayProgress(Math.floor(Math.random() * readingGoal));
        
        setIsLoading(false);
    }, [user, readingGoal]);
    
    if (!user) {
        return (
            <Card className="bg-card p-4 md:p-6 shadow-inner border-border/50 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline font-bold text-primary flex items-center justify-center gap-3">
                        <BookMarked className="h-8 w-8" />
                        Your Reading Nook
                    </CardTitle>
                    <CardDescription>Log in to track your reading and see what your friends are up to.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/auth/signin">
                        <Button>Sign In to Your Nook</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return <ReadingNookSkeleton />;
    }

    return (
        <Card className="bg-card p-4 md:p-6 shadow-inner border-border/50">
            <CardHeader className="p-2 text-center">
                 <CardTitle className="text-3xl font-headline font-bold text-primary flex items-center justify-center gap-3">
                    <BookMarked className="h-8 w-8" />
                    Your Reading Nook
                </CardTitle>
                <CardDescription>Your personal corner for reading stats and community updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-12 mt-4">
                <section>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-accent"/>Daily Reading Goal</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-3">
                                <Progress value={(todayProgress / readingGoal) * 100} className="w-full" />
                                <p className="text-sm text-muted-foreground">You've read <span className="font-bold text-primary">{todayProgress}</span> of your <span className="font-bold">{readingGoal}</span> minute goal today.</p>
                             </CardContent>
                        </Card>
                         <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-accent"/>Reading Streak</CardTitle>
                             </CardHeader>
                             <CardContent className="flex items-center gap-4">
                                <Flame className="h-10 w-10 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{readingStreak} Days</p>
                                    <p className="text-sm text-muted-foreground">Keep the fire going!</p>
                                </div>
                             </CardContent>
                        </Card>
                    </div>
                </section>
               
                <section>
                     <div className="flex items-center gap-2 mb-4">
                        <BookHeart className="h-6 w-6 text-accent"/>
                        <h3 className="text-2xl font-headline font-semibold">Continue Reading</h3>
                    </div>
                     {user.readingList && user.readingList.length > 0 ? (
                        <ScrollArea className="w-full whitespace-nowrap rounded-md">
                            <div className="flex space-x-4 pb-4">
                                {user.readingList.map(story => (
                                    <YourStoryCard key={`continue-${story.id}`} story={story} />
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    ) : (
                         <div className="text-center p-8 bg-muted/50 rounded-lg">
                            <p className="text-muted-foreground">You haven't added any stories to your library yet.</p>
                            <Link href="/stories"><Button variant="link">Explore Stories</Button></Link>
                         </div>
                    )}
                </section>

                 <section>
                         <div className="flex items-center gap-2 mb-4">
                            <Users className="h-6 w-6 text-accent"/>
                            <h3 className="text-2xl font-headline font-semibold">Friend Activity</h3>
                        </div>
                         {friendsActivity.length > 0 ? (
                            <div className="space-y-3">
                            {friendsActivity.map((activity, index) => (
                                <Card key={index} className="p-3">
                                    <div className="flex items-center gap-3">
                                        <Image src={activity.story.coverImageUrl || `https://picsum.photos/seed/${activity.story.id}/40/60`} alt={activity.story.title} width={40} height={60} className="rounded-sm object-cover aspect-[2/3]" />
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">
                                                <span className="font-semibold text-foreground">{activity.user.displayName}</span> just added <span className="font-semibold text-foreground">"{activity.story.title}"</span> to their library.
                                            </p>
                                        </div>
                                         <Link href={`/stories/${activity.story.id}`} passHref>
                                            <Button variant="ghost" size="sm">View</Button>
                                         </Link>
                                    </div>
                                </Card>
                            ))}
                            </div>
                         ) : (
                             <div className="text-center p-8 bg-muted/50 rounded-lg">
                                <p className="text-muted-foreground">No friend activity to show right now.</p>
                             </div>
                         )}
                 </section>

            </CardContent>
        </Card>
    );
}
