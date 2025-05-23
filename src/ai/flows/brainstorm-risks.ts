'use server';

/**
 * @fileOverview This file defines a Genkit flow for brainstorming potential risks associated with a given goal.
 *
 * - brainstormRisks - A function that takes a goal description as input and returns a list of potential risks.
 * - BrainstormRisksInput - The input type for the brainstormRisks function.
 * - BrainstormRisksOutput - The return type for the brainstormRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BrainstormRisksInputSchema = z.object({
  goalDescription: z
    .string()
    .describe('A description of the goal for which to brainstorm risks.'),
});
export type BrainstormRisksInput = z.infer<typeof BrainstormRisksInputSchema>;

const BrainstormRisksOutputSchema = z.object({
  risks: z
    .array(z.string())
    .describe('A list of potential risks associated with the goal.'),
});
export type BrainstormRisksOutput = z.infer<typeof BrainstormRisksOutputSchema>;

export async function brainstormRisks(
  input: BrainstormRisksInput
): Promise<BrainstormRisksOutput> {
  return brainstormRisksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'brainstormRisksPrompt',
  input: {schema: BrainstormRisksInputSchema},
  output: {schema: BrainstormRisksOutputSchema},
  prompt: `You are a risk management expert. Your task is to brainstorm potential risks associated with the following goal. Consider various internal and external factors that might prevent the goal from being achieved. Provide a detailed list of potential risks.

Goal Description: {{{goalDescription}}}

Risks:`,
});

const brainstormRisksFlow = ai.defineFlow(
  {
    name: 'brainstormRisksFlow',
    inputSchema: BrainstormRisksInputSchema,
    outputSchema: BrainstormRisksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
