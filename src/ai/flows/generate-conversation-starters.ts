'use server';
/**
 * @fileOverview An AI agent for generating conversation starters.
 *
 * - generateConversationStarters - A function that suggests topics to discuss.
 * - GenerateConversationStartersInput - The input type for the function.
 * - GenerateConversationStartersOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateConversationStartersInputSchema = z.object({
  user1_bio: z.string().optional().describe("The bio of the first user in the conversation."),
  user2_bio: z.string().optional().describe("The bio of the second user in the conversation."),
  commonInterests: z.array(z.string()).optional().describe("A list of common interests or story genres they both like."),
});
export type GenerateConversationStartersInput = z.infer<typeof GenerateConversationStartersInputSchema>;

const GenerateConversationStartersOutputSchema = z.object({
  starters: z.array(z.string()).describe('A list of 3-4 interesting and relevant conversation starters or questions.'),
});
export type GenerateConversationStartersOutput = z.infer<typeof GenerateConversationStartersOutputSchema>;

export async function generateConversationStarters(input: GenerateConversationStartersInput): Promise<GenerateConversationStartersOutput> {
  return generateConversationStartersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConversationStartersPrompt',
  input: {schema: GenerateConversationStartersInputSchema},
  output: {schema: GenerateConversationStartersOutputSchema},
  prompt: `You are an expert at sparking interesting conversations. Based on the following information about two users, generate 3-4 unique and engaging conversation starters or questions they could ask each other. The starters should be open-ended and encourage discussion.

User 1 Bio: {{{user1_bio}}}
User 2 Bio: {{{user2_bio}}}
Common Interests: {{#each commonInterests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Generate the conversation starters now.
`,
});

const generateConversationStartersFlow = ai.defineFlow(
  {
    name: 'generateConversationStartersFlow',
    inputSchema: GenerateConversationStartersInputSchema,
    outputSchema: GenerateConversationStartersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
