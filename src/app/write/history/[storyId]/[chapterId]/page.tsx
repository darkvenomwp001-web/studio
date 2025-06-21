
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Version {
  timestamp: number;
  content: string;
  chapterTitle: string;
}

// Helper to manage version history in sessionStorage (mirrored from edit page for consistency)
const VersionHistoryManager = {
  getKey: (storyId: string, chapterId: string) => `versionHistory-${storyId}-${chapterId}`,
  getVersions: (storyId: string, chapterId: string): Version[] => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(VersionHistoryManager.getKey(storyId, chapterId));
    return stored ? JSON.parse(stored) : [];
  },
};

export default function VersionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  
  const storyId = params.storyId as string;
  const chapterId = params.chapterId as string;

  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [storyTitleFromLatestVersion, setStoryTitleFromLatestVersion] = useState(''); // Not easily available, can infer from latest chapter title or pass via state

  useEffect(() => {
    if (storyId && chapterId) {
      const fetchedVersions = VersionHistoryManager.getVersions(storyId, chapterId);
      setVersions(fetchedVersions);
      if (fetchedVersions.length > 0) {
        setSelectedVersion(fetchedVersions[0]); // Select the latest version by default
        // Attempt to get story title from query or a placeholder - this is tricky without more context from edit page
        // For now, we'll use the chapter title from the latest version as a stand-in if no story title is passed.
        setStoryTitleFromLatestVersion(fetchedVersions[0].chapterTitle); 
      }
    }
  }, [storyId, chapterId]);

  const handleViewVersion = (version: Version) => {
    setSelectedVersion(version);
  };
  
  const editLink = `/write/edit?storyId=${storyId}&chapterId=${chapterId}`;


  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <header className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
          </Button>
          <h1 className="text-3xl font-headline font-bold text-primary">
            Version History
          </h1>
          {selectedVersion && <p className="text-muted-foreground">Chapter: {selectedVersion.chapterTitle}</p>}
          {!selectedVersion && versions.length > 0 && <p className="text-muted-foreground">Chapter: {versions[0].chapterTitle}</p>}
        </div>
      </header>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No version history found for this chapter.</p>
            <Link href={editLink}>
                <Button variant="link" className="mt-2">Go back to editing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 h-fit sticky top-24">
            <CardHeader>
              <CardTitle>Versions</CardTitle>
              <CardDescription>Select a version to view its content.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-20rem)] pr-3">
                <ul className="space-y-2">
                  {versions.map((version) => (
                    <li key={version.timestamp}>
                      <Button
                        variant={selectedVersion?.timestamp === version.timestamp ? 'secondary' : 'outline'}
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => handleViewVersion(version)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {format(new Date(version.timestamp), 'MMM d, yyyy - h:mm a')}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {version.content.substring(0, 30)}...
                          </span>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedVersion ? `Viewing Version from ${format(new Date(selectedVersion.timestamp), 'PPpp')}` : 'Select a Version'}
              </CardTitle>
              <CardDescription>
                Content of the selected version. This is a read-only view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedVersion ? (
                <Textarea
                  value={selectedVersion.content}
                  readOnly
                  className="min-h-[calc(100vh-22rem)] text-base p-4 bg-muted/50 resize-none"
                  rows={20}
                />
              ) : (
                <p className="text-muted-foreground py-10 text-center">Please select a version from the list to view its content.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
