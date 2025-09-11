'use server';
/**
 * @fileOverview An AI agent for generating creative captions for status updates.
 *
 * - generateStatusCaption - A function that generates captions based on an image.
 * - GenerateStatusCaptionInput - The input type for the function.
 * - GenerateStatusCaptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStatusCaptionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo for the status update, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateStatusCaptionInput = z.infer<typeof GenerateStatusCaptionInputSchema>;

const GenerateStatusCaptionOutputSchema = z.object({
  captions: z.array(z.string()).describe('A list of 3-4 short, engaging, and relevant caption suggestions for the image.'),
});
export type GenerateStatusCaptionOutput = z.infer<typeof GenerateStatusCaptionOutputSchema>;

export async function generateStatusCaption(input: GenerateStatusCaptionInput): Promise<GenerateStatusCaptionOutput> {
  return generateStatusCaptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStatusCaptionPrompt',
  input: {schema: GenerateStatusCaptionInputSchema},
  output: {schema: GenerateStatusCaptionOutputSchema},
  prompt: `You are a creative social media expert. Based on the image provided, generate 3-4 short, interesting, and engaging captions. The captions can be witty, descriptive, or ask a question.

Image: {{media url=photoDataUri}}

Generate the captions now.
`,
});

const generateStatusCaptionFlow = ai.defineFlow(
  {
    name: 'generateStatusCaptionFlow',
    inputSchema: GenerateStatusCaptionInputSchema,
    outputSchema: GenerateStatusCaptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
