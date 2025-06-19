'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, ShieldCheck, Loader2, AlertTriangle, Wand2 } from 'lucide-react';
import { getWritingSuggestions, checkPlagiarism } from '@/app/actions/aiActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AiAssistantPanelProps {
  initialText: string;
  onApplySuggestion?: (suggestedText: string) => void;
}

export default function AiAssistantPanel({ initialText, onApplySuggestion }: AiAssistantPanelProps) {
  const [textToAnalyze, setTextToAnalyze] = useState(initialText);
  const [suggestionResult, setSuggestionResult] = useState<{ improvedText: string; feedback: string } | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<{ isPlagiarized: boolean; source?: string; explanation?: string } | null>(null);
  
  const [isSuggestionLoading, startSuggestionTransition] = useTransition();
  const [isPlagiarismLoading, startPlagiarismTransition] = useTransition();

  const { toast } = useToast();

  const handleGetSuggestions = () => {
    if (!textToAnalyze.trim()) {
        toast({ title: "Input Required", description: "Please enter some text to get suggestions.", variant: "destructive"});
        return;
    }
    startSuggestionTransition(async () => {
      setSuggestionResult(null);
      const result = await getWritingSuggestions({ text: textToAnalyze });
      if ('error' in result) {
        toast({ title: "Error", description: `Failed to get suggestions: ${result.error}`, variant: "destructive"});
      } else {
        setSuggestionResult(result);
      }
    });
  };

  const handleCheckPlagiarism = () => {
     if (!textToAnalyze.trim()) {
        toast({ title: "Input Required", description: "Please enter some text to check for plagiarism.", variant: "destructive"});
        return;
    }
    startPlagiarismTransition(async () => {
      setPlagiarismResult(null);
      const result = await checkPlagiarism({ text: textToAnalyze });
      if ('error' in result) {
         toast({ title: "Error", description: `Failed to check plagiarism: ${result.error}`, variant: "destructive"});
      } else {
        setPlagiarismResult(result);
      }
    });
  };

  const handleApplySuggestion = () => {
    if (suggestionResult?.improvedText && onApplySuggestion) {
      onApplySuggestion(suggestionResult.improvedText);
      toast({ title: "Suggestion Applied", description: "The improved text has been applied to your editor."});
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-headline">
          <Brain className="h-5 w-5 text-primary" /> AI Writing Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="suggestions">Style & Grammar</TabsTrigger>
            <TabsTrigger value="plagiarism">Plagiarism Check</TabsTrigger>
          </TabsList>

          <Textarea
            value={textToAnalyze}
            onChange={(e) => setTextToAnalyze(e.target.value)}
            placeholder="Paste or type text here for AI analysis..."
            className="min-h-[100px] mb-3 bg-background"
            rows={5}
          />

          <TabsContent value="suggestions">
            <Button onClick={handleGetSuggestions} disabled={isSuggestionLoading} className="w-full mb-4 bg-primary hover:bg-primary/90">
              {isSuggestionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Get Suggestions
            </Button>
            {suggestionResult && (
              <div className="space-y-3 p-3 border rounded-md bg-background">
                <div>
                  <h4 className="font-semibold text-sm">Improved Text:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestionResult.improvedText}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Feedback:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestionResult.feedback}</p>
                </div>
                {onApplySuggestion && (
                  <Button onClick={handleApplySuggestion} size="sm" variant="outline">Apply Suggestion</Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="plagiarism">
            <Button onClick={handleCheckPlagiarism} disabled={isPlagiarismLoading} className="w-full mb-4 bg-primary hover:bg-primary/90">
              {isPlagiarismLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Check for Plagiarism
            </Button>
            {plagiarismResult && (
              <div className={`p-3 border rounded-md ${plagiarismResult.isPlagiarized ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {plagiarismResult.isPlagiarized ? 
                    <AlertTriangle className="h-5 w-5 text-destructive" /> : 
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  }
                  <h4 className={`font-semibold text-sm ${plagiarismResult.isPlagiarized ? 'text-destructive' : 'text-green-700 dark:text-green-500'}`}>
                    {plagiarismResult.isPlagiarized ? 'Potential Plagiarism Detected' : 'No Plagiarism Detected'}
                  </h4>
                </div>
                {plagiarismResult.explanation && (
                  <div>
                    <h5 className="font-medium text-xs">Explanation:</h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{plagiarismResult.explanation}</p>
                  </div>
                )}
                {plagiarismResult.source && (
                  <div className="mt-1">
                    <h5 className="font-medium text-xs">Possible Source:</h5>
                    <p className="text-xs text-muted-foreground">{plagiarismResult.source}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
