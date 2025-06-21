'use server';
/**
 * @fileOverview An AI agent for matching story moods.
 *
 * - matchStoryMood - A function that analyzes a story and generates a mood description.
 * - MatchStoryMoodInput - The input type for the matchStoryMood function.
 * - MatchStoryMoodOutput - The return type for the matchStoryMood function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchStoryMoodInputSchema = z.object({
  title: z.string().describe('The title of the story.'),
  summary: z.string().describe('The summary of the story.'),
  tags: z.array(z.string()).describe('A list of tags associated with the story.'),
});
export type MatchStoryMoodInput = z.infer<typeof MatchStoryMoodInputSchema>;

const MatchStoryMoodOutputSchema = z.object({
  mood: z
    .string()
    .describe('A short, catchy phrase (2-4 words) describing the mood or vibe of the story. e.g., "Dark Academia Thriller", "Cozy Fantasy Romance", "Epic Space Opera".'),
});
export type MatchStoryMoodOutput = z.infer<typeof MatchStoryMoodOutputSchema>;

export async function matchStoryMood(input: MatchStoryMoodInput): Promise<MatchStoryMoodOutput> {
  return matchStoryMoodFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchStoryMoodPrompt',
  input: {schema: MatchStoryMoodInputSchema},
  output: {schema: MatchStoryMoodOutputSchema},
  prompt: `You are a "mood matcher" for a story platform. Based on the story's title, summary, and tags, generate a short, catchy phrase (2-4 words) that describes its mood or vibe.

  Story Title: {{{title}}}
  Story Summary: {{{summary}}}
  Tags: {{#each tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Examples of good moods: "Cyberpunk Noir Mystery", "Heartwarming Slice of Life", "High-Fantasy Epic Quest", "Gothic Romance Horror".

  Generate the mood now.
  `,
});

const matchStoryMoodFlow = ai.defineFlow(
  {
    name: 'matchStoryMoodFlow',
    inputSchema: MatchStoryMoodInputSchema,
    outputSchema: MatchStoryMoodOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
