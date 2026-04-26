'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, ShieldCheck, Loader2, AlertTriangle, Wand2, CheckCircle, ShieldAlert } from 'lucide-react';
import { getWritingSuggestions, checkPlagiarism } from '@/app/actions/aiActions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const OWNER_USERNAMES = ['arnv'];

export default function AiAssistantPage() {
  const { user, loading } = useAuth();
  const [inputText, setInputText] = useState('');
  const [suggestionResult, setSuggestionResult] = useState<{ improvedText: string; feedback: string } | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<{ isPlagiarized: boolean; source?: string; explanation?: string } | null>(null);
  
  const [isSuggestionLoading, startSuggestionTransition] = useTransition();
  const [isPlagiarismLoading, startPlagiarismTransition] = useTransition();
  const { toast } = useToast();

  const handleGetSuggestions = () => {
    if (!inputText.trim()) {
        toast({ title: "Input Required", description: "Please enter some text.", variant: "destructive"});
        return;
    }
    startSuggestionTransition(async () => {
      setSuggestionResult(null);
      const result = await getWritingSuggestions({ text: inputText });
      if ('error' in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setSuggestionResult(result);
      }
    });
  };

  const handleCheckPlagiarism = () => {
    if (!inputText.trim()) {
        toast({ title: "Input Required", description: "Please enter some text.", variant: "destructive"});
        return;
    }
    startPlagiarismTransition(async () => {
      setPlagiarismResult(null);
      const result = await checkPlagiarism({ text: inputText });
      if ('error' in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setPlagiarismResult(result);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      </div>
    );
  }

  if (user?.role !== 'writer' && !OWNER_USERNAMES.includes(user?.username || '')) {
    return (
      <div className="space-y-8 text-center py-10 max-w-3xl mx-auto">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-bold text-foreground">Writer Access Required</h1>
        <p className="text-muted-foreground max-w-md mx-auto">The AI Assistant is a tool for authors. Contributors can grant you writer access to use this feature.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">AI Writing Assistant</h1>
        <p className="text-muted-foreground">Enhance your writing with AI-powered suggestions and plagiarism checks.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline">
            <Brain className="h-6 w-6 text-accent" /> Your Text
          </CardTitle>
          <CardDescription>Enter the text you want to analyze below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="min-h-[200px] text-base p-4 bg-background focus-visible:ring-2 focus-visible:ring-primary"
            rows={10}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg shadow-sm">
          <TabsTrigger value="suggestions" className="font-headline">
            Style & Grammar
          </TabsTrigger>
          <TabsTrigger value="plagiarism" className="font-headline">
            Plagiarism Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Wand2 className="h-5 w-5 text-accent" /> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestionResult && (
                <div className="space-y-4 p-4 border rounded-md bg-background/50">
                  <div>
                    <h4 className="font-semibold text-md mb-1">Improved Text:</h4>
                    <Textarea value={suggestionResult.improvedText} readOnly className="min-h-[100px] bg-muted/30 text-sm" rows={5} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-md mb-1">Feedback:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-md">{suggestionResult.feedback}</p>
                  </div>
                </div>
              )}
              {isSuggestionLoading && <div className="flex items-center justify-center p-6"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</div>}
            </CardContent>
            <CardFooter>
              <Button onClick={handleGetSuggestions} disabled={isSuggestionLoading || !inputText.trim()} className="w-full">
                Get Suggestions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plagiarism" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <ShieldCheck className="h-5 w-5 text-accent" /> Plagiarism Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plagiarismResult && (
                <div className={`space-y-3 p-4 border rounded-md ${plagiarismResult.isPlagiarized ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {plagiarismResult.isPlagiarized ? <AlertTriangle className="h-6 w-6 text-destructive" /> : <CheckCircle className="h-6 w-6 text-green-600" />}
                    <h4 className={`font-semibold text-lg ${plagiarismResult.isPlagiarized ? 'text-destructive' : 'text-green-700'}`}>{plagiarismResult.isPlagiarized ? 'Potential Plagiarism Detected' : 'No Plagiarism Detected'}</h4>
                  </div>
                  {plagiarismResult.explanation && <p className="text-sm text-muted-foreground">{plagiarismResult.explanation}</p>}
                </div>
              )}
              {isPlagiarismLoading && <div className="flex items-center justify-center p-6"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</div>}
            </CardContent>
            <CardFooter>
              <Button onClick={handleCheckPlagiarism} disabled={isPlagiarismLoading || !inputText.trim()} className="w-full">
                Check for Plagiarism
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}