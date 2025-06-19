'use server';

/**
 * @fileOverview An AI agent for generating story outlines from a prompt.
 *
 * - generateStoryOutline - A function that generates a story outline.
 * - GenerateStoryOutlineInput - The input type for the generateStoryOutline function.
 * - GenerateStoryOutlineOutput - The return type for the generateStoryOutline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryOutlineInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the story outline from.'),
});
export type GenerateStoryOutlineInput = z.infer<typeof GenerateStoryOutlineInputSchema>;

const GenerateStoryOutlineOutputSchema = z.object({
  outline: z.string().describe('The generated story outline.'),
});
export type GenerateStoryOutlineOutput = z.infer<typeof GenerateStoryOutlineOutputSchema>;

export async function generateStoryOutline(input: GenerateStoryOutlineInput): Promise<GenerateStoryOutlineOutput> {
  return generateStoryOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryOutlinePrompt',
  input: {schema: GenerateStoryOutlineInputSchema},
  output: {schema: GenerateStoryOutlineOutputSchema},
  prompt: `You are a story writing expert. Please generate a detailed story outline based on the following prompt:\n\nPrompt: {{{prompt}}}`,
});

const generateStoryOutlineFlow = ai.defineFlow(
  {
    name: 'generateStoryOutlineFlow',
    inputSchema: GenerateStoryOutlineInputSchema,
    outputSchema: GenerateStoryOutlineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
