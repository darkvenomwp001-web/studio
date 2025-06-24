
'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Edit, Edit3, Users, FileText, ShieldAlert, Settings, Sparkles, LogOut, HelpCircle, Check, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Question } from '@/types';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import FollowerUserCard from '@/components/shared/FollowerUserCard';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { askQuestion, answerQuestion, declineQuestion } from '@/app/actions/qaActions';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfileStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status' | 'visibility'>;
  isPrivate?: boolean; 
}

function ProfileStoryCard({ story, isPrivate = false }: ProfileStoryCardProps) {
  const editLink = `/write/edit-details?storyId=${story.id}`;
  const viewLink = `/stories/${story.id}`;

  return (
    <div className="w-36 md:w-40 flex-shrink-0 group text-center">
       <Link href={isPrivate ? editLink : viewLink} passHref>
        <div className={cn(
            "aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted cursor-pointer mb-2",
             isPrivate && "opacity-70 group-hover:opacity-100" 
        )}>
          <Image
            src={story.coverImageUrl || 'https://placehold.co/512x800.png'}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
           {isPrivate && ( 
            <Badge variant="outline" className="absolute top-2 right-2 text-xs bg-background/80 capitalize">{story.status === 'Draft' ? 'Draft' : story.visibility}</Badge>
          )}
        </div>
      </Link>
      <Link href={isPrivate ? editLink : viewLink} passHref>
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
            {story.title}
          </p>
      </Link>
      <p className="text-xs text-muted-foreground truncate">{story.genre}</p>
    </div>
  );
}

function AskQuestionForm({ author, asker }: { author: AppUser, asker: AppUser }) {
    const [questionText, setQuestionText] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await askQuestion(author.id, questionText, {
            id: asker.id,
            username: asker.username,
            displayName: asker.displayName,
            avatarUrl: asker.avatarUrl,
        }, isPublic);

        if (result.success) {
            setQuestionText('');
            toast({ title: 'Question Sent!', description: `Your question has been sent to ${author.displayName || author.username}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Ask {author.displayName || author.username} a Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea 
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Type your question here..."
                        maxLength={500}
                        rows={4}
                        disabled={isSubmitting}
                    />
                    <div className="flex items-center space-x-2">
                        <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} disabled={isSubmitting} />
                        <Label htmlFor="isPublic" className="flex items-center text-sm text-muted-foreground">
                            Allow question and answer to be public if answered
                            <HelpCircle className="ml-1.5 h-4 w-4 cursor-help" title="If checked, your question and the author's response may be visible on their profile. If unchecked, only you will see the answer." />
                        </Label>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || questionText.trim().length < 10}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Submit Question
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function AnsweredQuestionCard({ question }: { question: Question }) {
    return (
        <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={question.asker.avatarUrl} alt={question.asker.username} data-ai-hint="profile person" />
                    <AvatarFallback>{question.asker.username.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                        {question.asker.displayName || question.asker.username} asked:
                    </p>
                    <p className="text-sm text-muted-foreground italic">"{question.questionText}"</p>
                </div>
            </div>
            <div className="mt-3 pl-11">
                <div className="p-3 border-l-2 border-primary/50">
                     <p className="text-sm font-semibold text-primary mb-1">Author's Answer:</p>
                     <p className="text-sm text-foreground/90 whitespace-pre-line">{question.answerText}</p>
                </div>
            </div>
        </div>
    );
}

function PendingQuestionCard({ question }: { question: Question }) {
    const { toast } = useToast();
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleAnswer = async () => {
        setIsSubmitting(true);
        const result = await answerQuestion(question.id, answer);
        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
             toast({ title: 'Success', description: 'Your answer has been posted.' });
        }
        setIsSubmitting(false);
    };

    const handleDecline = async () => {
        setIsSubmitting(true);
        const result = await declineQuestion(question.id);
        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };
    
    return (
         <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={question.asker.avatarUrl} alt={question.asker.username} data-ai-hint="profile person" />
                    <AvatarFallback>{question.asker.username.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                     <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{question.asker.displayName || question.asker.username}</span> asked {formatDistanceToNow(question.createdAt.toDate(), { addSuffix: true })}:
                    </p>
                    <p className="text-sm text-foreground/90 italic">"{question.questionText}"</p>
                    
                    {!isExpanded && (
                        <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => setIsExpanded(true)}>Reply</Button>
                    )}

                    {isExpanded && (
                         <div className="mt-3 space-y-2">
                             <Textarea 
                                placeholder="Write your answer..."
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                rows={4}
                                disabled={isSubmitting}
                             />
                             <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                     <Button size="sm" onClick={handleAnswer} disabled={isSubmitting || answer.trim().length < 10}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                                        Answer
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={handleDecline} disabled={isSubmitting}>
                                         <X className="mr-2 h-4 w-4"/> Decline
                                    </Button>
                                </div>
                                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsExpanded(false)}>Collapse</Button>
                             </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UserProfilePage() {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, signOutFirebase } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 
  const [followingDetails, setFollowingDetails] = useState<AppUser[]>([]);
  const [followersDetails, setFollowersDetails] = useState<AppUser[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const isOwnProfile = currentUser?.id === userId;
  
  useEffect(() => {
    if (!profileUser) {
        setQuestions([]);
        return;
    }
    
    // Base query for answered, public questions
    const answeredQuery = query(
        collection(db, 'questions'),
        where('authorId', '==', profileUser.id),
        where('status', '==', 'answered'),
        where('isPublic', '==', true),
        orderBy('answeredAt', 'desc')
    );

    let unsubAnswered: Unsubscribe;
    let unsubPending: Unsubscribe | undefined;

    if (isOwnProfile) {
        // For owner, fetch both pending and answered
        const pendingQuery = query(
            collection(db, 'questions'),
            where('authorId', '==', profileUser.id),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        
        let pendingCache: Question[] = [];
        let answeredCache: Question[] = [];
        
        const updateState = () => {
            setQuestions([...pendingCache, ...answeredCache]);
        };

        unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            pendingCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            updateState();
        });

        unsubAnswered = onSnapshot(answeredQuery, (snapshot) => {
            answeredCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            updateState();
        });

    } else {
        // For visitors, only fetch answered questions
        unsubAnswered = onSnapshot(answeredQuery, (snapshot) => {
            const answeredQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(answeredQuestions);
        });
    }
    
    return () => {
        unsubAnswered();
        if (unsubPending) unsubPending();
    };
  }, [profileUser, isOwnProfile]);


  useEffect(() => {
    if (!userId) {
      toast({ title: "Error", description: "User ID is missing.", variant: "destructive" });
      router.push('/');
      return;
    }

    setProfileUser(null);
    setPublishedWorks([]);
    setPrivateWorks([]);
    setFollowingDetails([]);
    setFollowersDetails([]);
    setLiveFollowersCount(null);
    setIsLoadingData(true);

    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        setProfileUser(null);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching profile user:", error);
      toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
      setProfileUser(null);
      setIsLoadingData(false);
    });

    const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', userId));
    const unsubscribeFollowersCount = onSnapshot(followersQuery, (snapshot) => {
      setLiveFollowersCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching live follower count:", error);
    });


    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
    };
  }, [userId, router, toast]);

  useEffect(() => {
    if (!profileUser) {
        setPublishedWorks([]);
        setPrivateWorks([]);
        setFollowingDetails([]);
        setFollowersDetails([]);
        return;
    }

    let unsubStories: Unsubscribe | undefined;
    let unsubFollowersDetails: Unsubscribe | undefined;
    
    let storiesQuery;
    if (isOwnProfile) {
        storiesQuery = query(
            collection(db, 'stories'),
            where('author.id', '==', profileUser.id),
            orderBy('lastUpdated', 'desc')
        );
    } else {
        storiesQuery = query(
            collection(db, 'stories'),
            where('author.id', '==', profileUser.id),
            where('visibility', '==', 'Public'),
            orderBy('lastUpdated', 'desc')
        );
    }
    
    unsubStories = onSnapshot(storiesQuery, (snapshot) => {
        const userWrittenStories = snapshot.docs.map(storyDoc => ({ id: storyDoc.id, ...storyDoc.data() } as Story));
        
        const published = userWrittenStories.filter(s => s.visibility === 'Public' && s.status !== 'Draft');
        setPublishedWorks(published);
        
        if (isOwnProfile) {
            const privateAndDrafts = userWrittenStories.filter(s => s.status === 'Draft' || s.visibility !== 'Public');
            setPrivateWorks(privateAndDrafts);
        } else {
            setPrivateWorks([]);
        }
    }, (error) => {
        console.error("Error fetching stories:", error);
        toast({ title: "Error", description: "Could not load stories.", variant: "destructive" });
    });

    const fetchFollowingDetails = async () => {
        if (profileUser.followingIds && profileUser.followingIds.length > 0) {
            const limitedFollowingIds = profileUser.followingIds.slice(0, 20); // Limit for display
            const followingPromises = limitedFollowingIds.map(id => getDoc(doc(db, 'users', id)));
            try {
                const followingDocsArray = await Promise.all(followingPromises);
                const followedUsers = followingDocsArray
                    .filter(docSnap => docSnap.exists())
                    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
                setFollowingDetails(followedUsers);
            } catch (error) {
                console.error("Error fetching following details:", error);
                toast({ title: "Error", description: "Could not load following list.", variant: "destructive" });
            }
        } else {
            setFollowingDetails([]);
        }
    };
    fetchFollowingDetails();

    const followersDetailsQuery = query(
        collection(db, 'users'),
        where('followingIds', 'array-contains', profileUser.id),
        limit(20)
    );
    unsubFollowersDetails = onSnapshot(followersDetailsQuery, (snapshot) => {
        const fetchedFollowers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
        setFollowersDetails(fetchedFollowers);
    }, (error) => {
        console.error("Error fetching followers:", error);
        toast({ title: "Error", description: "Could not load followers list.", variant: "destructive" });
    });
    

    return () => {
        if (unsubStories) unsubStories();
        if (unsubFollowersDetails) unsubFollowersDetails();
    };
  }, [profileUser, isOwnProfile, toast]);


  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }
    if (!profileUser) return;

    if (currentUser.followingIds?.includes(profileUser.id)) {
      await unfollowUser(profileUser.id);
    } else {
      await followUser(profileUser.id);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return (
        <div className="text-center py-10">
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Profile Not Found</h2>
            <p className="text-muted-foreground">The user profile you are looking for does not exist.</p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-4">Go to Homepage</Button>
        </div>
    );
  }

  const isFollowing = currentUser?.followingIds?.includes(profileUser.id) || false;
  const displayName = profileUser.displayName || profileUser.username;

  const pendingQuestions = questions.filter(q => q.status === 'pending');
  const answeredQuestions = questions.filter(q => q.status === 'answered');

  return (
    <div className="space-y-10 pb-10">
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src="https://placehold.co/1200x300.png" alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract landscape"/>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
            <AvatarImage src={profileUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={displayName} data-ai-hint="profile person" />
            <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            {profileUser.bio && <p className="text-muted-foreground mt-1 max-w-xl">{profileUser.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {profileUser.role && <Badge variant={profileUser.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{profileUser.role}</Badge>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 self-center md:self-end">
            {isOwnProfile ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/settings" passHref>
                  <Button variant="outline" className="w-full sm:w-auto"><Settings className="mr-2 h-4 w-4" /> Profile Settings</Button>
                </Link>
                <Button variant="destructive" onClick={signOutFirebase} className="w-full sm:w-auto"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
              </div>
            ) : currentUser ? (
              <>
                <Button
                    onClick={handleFollowToggle}
                    disabled={followActionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="min-w-[120px] w-full sm:w-auto"
                >
                  {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                    isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />
                  }
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                 <Link href={`/notifications?tab=messages&startConversationWith=${profileUser.id}`} passHref>
                    <Button variant="outline" className="w-full sm:w-auto"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                </Link>
              </>
            ) : (
                <Button onClick={() => router.push('/auth/signin')} variant="default" className="min-w-[120px] w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" /> Follow
                </Button>
            )}
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{publishedWorks.length}</strong> Public Works</span>
          <span><strong className="text-foreground">{liveFollowersCount ?? '...'}</strong> Followers</span>
          <span><strong className="text-foreground">{profileUser.followingCount || 0}</strong> Following</span>
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <HelpCircle className="h-6 w-6" /> Author Q&A
        </h2>
        <div className="space-y-6">
            {!isOwnProfile && currentUser && <AskQuestionForm author={profileUser} asker={currentUser} />}
            
            {isOwnProfile && pendingQuestions.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Pending Questions</h3>
                    <div className="space-y-4">
                        {pendingQuestions.map(q => <PendingQuestionCard key={q.id} question={q} />)}
                    </div>
                </div>
            )}
            
            {answeredQuestions.length > 0 && (
                 <div>
                    <h3 className="text-lg font-semibold mb-2 mt-6">Answered Questions</h3>
                    <div className="space-y-4">
                        {answeredQuestions.map(q => <AnsweredQuestionCard key={q.id} question={q} />)}
                    </div>
                </div>
            )}
            
            {questions.length === 0 && (
                <p className="text-center text-muted-foreground py-6 bg-card rounded-lg">
                    {isOwnProfile ? "No questions yet. Share your profile to get some!" : `Be the first to ask ${displayName} a question!`}
                </p>
            )}
        </div>
      </section>

      {publishedWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Edit3 className="h-6 w-6" /> Published Works
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {publishedWorks.map(story => (
                <ProfileStoryCard key={`published-${story.id}`} story={story} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {isOwnProfile && privateWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-accent flex items-center gap-2">
            <FileText className="h-6 w-6" /> My Private Works & Drafts
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {privateWorks.map(story => (
                <ProfileStoryCard key={`draft-${story.id}`} story={story} isPrivate />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {(publishedWorks.length === 0 && (!isOwnProfile || privateWorks.length === 0)) && (
         <div className="text-center py-10 text-muted-foreground">
            {isOwnProfile ? "You haven't published any stories yet." : `${displayName} hasn't published any stories yet.`}
            {isOwnProfile && <Link href="/write/edit-details" className="text-primary hover:underline ml-1">Start your first story!</Link>}
        </div>
      )}

      {followersDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Followers ({liveFollowersCount ?? followersDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {followersDetails.map(followerUser => (
                <FollowerUserCard key={`follower-${followerUser.id}`} user={followerUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
      {followersDetails.length === 0 && (liveFollowersCount === null || liveFollowersCount === 0) && (
         <div className="text-center py-6 text-muted-foreground">
            {isOwnProfile ? "You don't" : `${displayName} doesn't`} have any followers yet.
        </div>
      )}
      
      {followingDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Following ({profileUser.followingCount || followingDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {followingDetails.map(followedUser => (
                <FollowerUserCard key={`following-${followedUser.id}`} user={followedUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
      {followingDetails.length === 0 && profileUser.followingCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            {isOwnProfile ? "You aren't" : `${displayName} isn't`} following anyone yet.
        </div>
      )}
    </div>
  );
}
