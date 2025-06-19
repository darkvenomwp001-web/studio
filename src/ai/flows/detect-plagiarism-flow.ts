'use server';
/**
 * @fileOverview Plagiarism detection AI agent.
 *
 * - detectPlagiarism - A function that handles the plagiarism detection process.
 * - DetectPlagiarismInput - The input type for the detectPlagiarism function.
 * - DetectPlagiarismOutput - The return type for the detectPlagiarism function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectPlagiarismInputSchema = z.object({
  text: z.string().describe('The text to check for plagiarism.'),
});
export type DetectPlagiarismInput = z.infer<typeof DetectPlagiarismInputSchema>;

const DetectPlagiarismOutputSchema = z.object({
  isPlagiarized: z.boolean().describe('Whether or not the text is plagiarized.'),
  source: z.string().optional().describe('The source of the plagiarism, if found.'),
  explanation: z
    .string()
    .optional()
    .describe('An explanation of why the text is considered plagiarized.'),
});
export type DetectPlagiarismOutput = z.infer<typeof DetectPlagiarismOutputSchema>;

export async function detectPlagiarism(input: DetectPlagiarismInput): Promise<DetectPlagiarismOutput> {
  return detectPlagiarismFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectPlagiarismPrompt',
  input: {schema: DetectPlagiarismInputSchema},
  output: {schema: DetectPlagiarismOutputSchema},
  prompt: `You are a plagiarism detection expert. You will determine whether the provided text is plagiarized or not.

  Text: {{{text}}}

  Respond in JSON format with the isPlagiarized boolean field set to true if the text is plagiarized, and false otherwise. If isPlagiarized is true, also include the source of the plagiarism and an explanation.
  `,
});

const detectPlagiarismFlow = ai.defineFlow(
  {
    name: 'detectPlagiarismFlow',
    inputSchema: DetectPlagiarismInputSchema,
    outputSchema: DetectPlagiarismOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
