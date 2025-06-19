'use server';

import { improveWritingStyle as improveWritingStyleFlow, ImproveWritingStyleInput, ImproveWritingStyleOutput } from '@/ai/flows/improve-writing-style';
import { detectPlagiarism as detectPlagiarismFlow, DetectPlagiarismInput, DetectPlagiarismOutput } from '@/ai/flows/detect-plagiarism-flow';

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
