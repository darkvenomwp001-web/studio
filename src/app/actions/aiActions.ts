'use server';

import { improveWritingStyle as improveWritingStyleFlow, ImproveWritingStyleInput, ImproveWritingStyleOutput } from '@/ai/flows/improve-writing-style';
import { detectPlagiarism as detectPlagiarismFlow, DetectPlagiarismInput, DetectPlagiarismOutput } from '@/ai/flows/detect-plagiarism-flow';
import { matchStoryMood as matchStoryMoodFlow, MatchStoryMoodInput, MatchStoryMoodOutput } from '@/ai/flows/mood-matcher-flow';
import { generateConversationStarters as generateConversationStartersFlow, GenerateConversationStartersInput, GenerateConversationStartersOutput } from '@/ai/flows/generate-conversation-starters';
import { generateStatusCaption as generateStatusCaptionFlow, GenerateStatusCaptionInput, GenerateStatusCaptionOutput } from '@/ai/flows/generate-status-caption';

export async function getWritingSuggestions(input: ImproveWritingStyleInput): Promise<ImproveWritingStyleOutput | { error: string }> {
  try {
    console.log("AI Action: Getting writing suggestions for text:", input.text.substring(0,50) + "...");
    const result = await improveWritingStyleFlow(input);
    console.log("AI Action: Suggestions received:", result.improvedText.substring(0,50) + "...");
    return result;
  } catch (error) {
    console.error("Error in getWritingSuggestions AI action:", error);
    return { error: (error instanceof Error ? error.message : "An unknown error occurred") };
  }
}

export async function checkPlagiarism(input: DetectPlagiarismInput): Promise<DetectPlagiarismOutput | { error: string }> {
  try {
    console.log("AI Action: Checking plagiarism for text:", input.text.substring(0,50) + "...");
    const result = await detectPlagiarismFlow(input);
    console.log("AI Action: Plagiarism check result:", result.isPlagiarized);
    return result;
  } catch (error) {
    console.error("Error in checkPlagiarism AI action:", error);
    return { error: (error instanceof Error ? error.message : "An unknown error occurred") };
  }
}

export async function getStoryMood(input: MatchStoryMoodInput): Promise<MatchStoryMoodOutput | { error: string }> {
  try {
    console.log("AI Action: Matching mood for story:", input.title);
    const result = await matchStoryMoodFlow(input);
    console.log("AI Action: Mood received:", result.mood);
    return result;
  } catch (error) {
    console.error("Error in getStoryMood AI action:", error);
    return { error: (error instanceof Error ? error.message : "An unknown error occurred") };
  }
}

export async function getConversationStarters(input: GenerateConversationStartersInput): Promise<GenerateConversationStartersOutput | { error: string }> {
    try {
        const result = await generateConversationStartersFlow(input);
        return result;
    } catch (error) {
        console.error("Error in getConversationStarters AI action:", error);
        return { error: (error instanceof Error ? error.message : "An unknown error occurred") };
    }
}

export async function getStatusCaptions(input: GenerateStatusCaptionInput): Promise<GenerateStatusCaptionOutput | { error: string }> {
    try {
        const result = await generateStatusCaptionFlow(input);
        return result;
    } catch (error) {
        console.error("Error in getStatusCaptions AI action:", error);
        return { error: (error instanceof Error ? error.message : "An unknown error occurred") };
    }
}
