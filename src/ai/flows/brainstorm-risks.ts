
'use server';

/**
 * @fileOverview This file defines a Genkit flow for brainstorming potential risks associated with a given goal.
 *
 * - brainstormPotentialRisks - A function that takes a goal description as input and returns a list of potential risk descriptions.
 * - BrainstormPotentialRisksInput - The input type for the brainstormPotentialRisks function.
 * - BrainstormPotentialRisksOutput - The return type for the brainstormPotentialRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BrainstormPotentialRisksInputSchema = z.object({
  goalDescription: z
    .string()
    .describe('A description of the goal for which to brainstorm potential risks.'),
});
export type BrainstormPotentialRisksInput = z.infer<typeof BrainstormPotentialRisksInputSchema>;

const BrainstormPotentialRisksOutputSchema = z.object({
  potentialRisks: z
    .array(z.string())
    .describe('A list of potential risk descriptions associated with the goal.'),
});
export type BrainstormPotentialRisksOutput = z.infer<typeof BrainstormPotentialRisksOutputSchema>;

export async function brainstormPotentialRisks(
  input: BrainstormPotentialRisksInput
): Promise<BrainstormPotentialRisksOutput> {
  return brainstormPotentialRisksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'brainstormPotentialRisksPrompt',
  input: {schema: BrainstormPotentialRisksInputSchema},
  output: {schema: BrainstormPotentialRisksOutputSchema},
  prompt: `You are a risk management expert. Your task is to brainstorm potential risks (potensi risiko) associated with the following goal. Consider various internal and external factors that might prevent the goal from being achieved. Provide a detailed list of potential risk descriptions.

Goal Description: {{{goalDescription}}}

Potential Risks:`,
});

const brainstormPotentialRisksFlow = ai.defineFlow(
  {
    name: 'brainstormPotentialRisksFlow',
    inputSchema: BrainstormPotentialRisksInputSchema,
    outputSchema: BrainstormPotentialRisksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure output structure matches, specifically the key "potentialRisks"
    if (output && Array.isArray(output.potentialRisks)) {
      return output;
    }
    // Fallback or error handling if the output structure is not as expected
    // This might happen if the LLM returns a different structure
    console.warn("AI output for potential risks was not in the expected format, attempting to adapt.");
    if (output && (output as any).risks && Array.isArray((output as any).risks)) {
        return { potentialRisks: (output as any).risks };
    }
    return { potentialRisks: [] };
  }
);
