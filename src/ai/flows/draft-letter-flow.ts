'use server';
/**
 * @fileOverview An AI agent for drafting heartfelt letters between readers and authors.
 *
 * - draftLetter - A function that suggests a draft for a letter or response.
 * - DraftLetterInput - The input type for the function.
 * - DraftLetterOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DraftLetterInputSchema = z.object({
  context: z.string().describe('The context of the letter, e.g., the story title and chapter content summary.'),
  sender_type: z.enum(['reader', 'author']).describe('Whether the sender is a reader writing to an author or an author responding to a reader.'),
  tone: z.string().optional().describe('The desired tone of the letter (e.g., appreciative, curious, encouraging, humble).'),
  recipient_name: z.string().optional().describe('The name of the person the letter is for.'),
  original_letter: z.string().optional().describe('If this is a response, the content of the letter being responded to.'),
});
export type DraftLetterInput = z.infer<typeof DraftLetterInputSchema>;

const DraftLetterOutputSchema = z.object({
  draft: z.string().describe('The AI-generated draft of the letter.'),
});
export type DraftLetterOutput = z.infer<typeof DraftLetterOutputSchema>;

export async function draftLetter(input: DraftLetterInput): Promise<DraftLetterOutput> {
  return draftLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftLetterPrompt',
  input: {schema: DraftLetterInputSchema},
  output: {schema: DraftLetterOutputSchema},
  prompt: `You are an expert at writing heartfelt, sincere letters for a community of readers and authors called D4RKV3NOM.

  Context: {{{context}}}
  Sender Role: {{{sender_type}}}
  Target: {{{recipient_name}}}
  Tone: {{{tone}}}
  {{#if original_letter}}Original Letter: "{{{original_letter}}}"{{/if}}

  Draft a sincere and engaging letter. 
  - If you are a reader, express specific appreciation for the author's creativity or ask a thoughtful question about the plot. 
  - If you are an author, show genuine gratitude for the reader's time and their specific comments. 
  
  Keep the length personal and warm (2-4 paragraphs). Do not use generic placeholders; make it feel like it was written by a real human who cares about the story.
  `,
});

const draftLetterFlow = ai.defineFlow(
  {
    name: 'draftLetterFlow',
    inputSchema: DraftLetterInputSchema,
    outputSchema: DraftLetterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
