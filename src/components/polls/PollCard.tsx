'use client';

import { useAuth } from "@/hooks/useAuth";
import type { Poll } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { voteOnPoll } from "@/app/actions/userActions";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';


export default function PollCard({ poll }: { poll: Poll }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isVoting, startVotingTransition] = useTransition();

    const userVote = user ? poll.options.find(opt => opt.votes.includes(user.id)) : null;
    const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

    const handleVote = (optionId: string) => {
        if (!user) {
            toast({ title: 'Please sign in to vote.', variant: 'destructive' });
            return;
        }
        if (userVote) {
            toast({ title: "You've already voted in this poll." });
            return;
        }
        startVotingTransition(async () => {
            const result = await voteOnPoll(poll.id, optionId, user.id);
            if (!result.success) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{poll.question}</CardTitle>
                <CardDescription>
                    {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} &bull; {poll.createdAt ? formatDistanceToNow(poll.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {poll.options.map(option => {
                    const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                    const isUserChoice = userVote?.id === option.id;
                    return (
                        <div key={option.id}>
                            {userVote ? (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <p className={cn("font-medium", isUserChoice && "text-primary")}>{option.text}</p>
                                        <p>{percentage.toFixed(0)}%</p>
                                    </div>
                                    <Progress value={percentage} />
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start h-auto p-3"
                                    onClick={() => handleVote(option.id)}
                                    disabled={isVoting}
                                >
                                    {isVoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {option.text}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    )
}
