
'use server';

/**
 * @fileOverview This file defines a Genkit flow for brainstorming potential risks associated with a given goal.
 *
 * - brainstormPotentialRisks - A function that takes a goal description and an optional desired count as input and returns a list of potential risk descriptions.
 * - BrainstormPotentialRisksInput - The input type for the brainstormPotentialRisks function.
 * - BrainstormPotentialRisksOutput - The return type for the brainstormPotentialRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BrainstormPotentialRisksInputSchema = z.object({
  goalDescription: z
    .string()
    .describe('A description of the goal for which to brainstorm potential risks.'),
  desiredCount: z
    .number()
    .optional()
    .describe('The desired number of potential risks to generate.'),
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
  prompt: (input: BrainstormPotentialRisksInput) => {
    let promptText = `You are a risk management expert. Your task is to brainstorm potential risks (potensi risiko) associated with the following goal. Consider various internal and external factors that might prevent the goal from being achieved. Provide a detailed list of potential risk descriptions.`;
    if (input.desiredCount && input.desiredCount > 0) {
      promptText += `\n\nPlease generate exactly ${input.desiredCount} distinct potential risk descriptions.`;
    } else {
      promptText += `\n\nPlease generate a list of potential risk descriptions (around 3-7 suggestions).`;
    }
    promptText += `\n\nGoal Description: {{{goalDescription}}}\n\nPotential Risks:`;
    return promptText;
  }
});

const brainstormPotentialRisksFlow = ai.defineFlow(
  {
    name: 'brainstormPotentialRisksFlow',
    inputSchema: BrainstormPotentialRisksInputSchema,
    outputSchema: BrainstormPotentialRisksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && Array.isArray(output.potentialRisks)) {
      return output;
    }
    console.warn("AI output for potential risks was not in the expected format, attempting to adapt.");
    if (output && (output as any).risks && Array.isArray((output as any).risks)) {
        return { potentialRisks: (output as any).risks };
    }
    return { potentialRisks: [] };
  }
);
