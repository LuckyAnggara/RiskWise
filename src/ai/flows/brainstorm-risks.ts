
'use server';

/**
 * @fileOverview This file defines a Genkit flow for brainstorming potential risks associated with a given goal, including their categories.
 *
 * - brainstormPotentialRisks - A function that takes a goal description and an optional desired count as input and returns a list of potential risk objects (description and category).
 * - BrainstormPotentialRisksInput - The input type for the brainstormPotentialRisks function.
 * - BrainstormPotentialRisksOutput - The return type for the brainstormPotentialRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RiskCategory } from '@/lib/types'; // Import RiskCategory type
import { RISK_CATEGORIES } from '@/lib/types'; // Import RISK_CATEGORIES constant

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

const PotentialRiskObjectSchema = z.object({
  description: z.string().describe('Deskripsi potensi risiko.'),
  category: z.custom<RiskCategory>().nullable().describe('Kategori risiko yang paling sesuai dari daftar yang diberikan, atau null jika tidak ada yang sangat cocok.'),
});

const BrainstormPotentialRisksOutputSchema = z.object({
  potentialRisks: z
    .array(PotentialRiskObjectSchema)
    .describe('A list of potential risk objects, each containing a description and an associated category.'),
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
    const availableCategories = RISK_CATEGORIES.join(', ');
    let promptText = `Anda adalah seorang ahli manajemen risiko. Tugas Anda adalah melakukan brainstorming potensi risiko yang terkait dengan sasaran berikut. Untuk setiap potensi risiko yang diidentifikasi, berikan deskripsi singkat dan tentukan kategori risiko yang paling sesuai dari daftar berikut: ${availableCategories}. Keluaran harus dalam format JSON yang sesuai dengan skema output. Pastikan deskripsi dan kategori risiko menggunakan Bahasa Indonesia.

Pertimbangkan berbagai faktor internal dan eksternal yang mungkin menghalangi tercapainya sasaran.`;

    if (input.desiredCount && input.desiredCount > 0) {
      promptText += `\n\nHarap hasilkan tepat ${input.desiredCount} potensi risiko yang berbeda, masing-masing dengan deskripsi dan kategorinya.`;
    } else {
      promptText += `\n\nHarap hasilkan daftar potensi risiko (sekitar 3-7 saran), masing-masing dengan deskripsi dan kategorinya.`;
    }
    promptText += `\n\nDeskripsi Sasaran: ${input.goalDescription}`;
    promptText += `\n\nContoh format JSON untuk setiap item dalam array 'potentialRisks': { "description": "deskripsi risiko...", "category": "Kategori Risiko Terpilih" }`;
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
      // Validate categories
      const validatedRisks = output.potentialRisks.map(risk => ({
        ...risk,
        category: risk.category && RISK_CATEGORIES.includes(risk.category as RiskCategory) ? risk.category : null,
      }));
      return { potentialRisks: validatedRisks };
    }
    console.warn("AI output for potential risks was not in the expected format, attempting to adapt.");
    // Attempt to adapt if AI returns a flat array of strings or slightly different structure
    if (output && (output as any).risks && Array.isArray((output as any).risks)) {
        // Assuming (output as any).risks might be an array of strings or objects without categories
        const adaptedRisks = (output as any).risks.map((r: any) => {
            if (typeof r === 'string') {
                return { description: r, category: null };
            } else if (typeof r === 'object' && r.description) {
                return { description: r.description, category: (r.category && RISK_CATEGORIES.includes(r.category as RiskCategory)) ? r.category : null };
            }
            return null;
        }).filter((r: any) => r !== null);
        return { potentialRisks: adaptedRisks as Array<{ description: string; category: RiskCategory | null }> };
    }
    return { potentialRisks: [] };
  }
);
