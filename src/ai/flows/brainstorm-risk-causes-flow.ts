
'use server';
/**
 * @fileOverview A Genkit flow for brainstorming potential risk causes using a Fishbone (Ishikawa) diagram approach.
 *
 * - brainstormRiskCauses - A function that takes potential risk context and returns a list of suggested risk causes with their sources.
 * - BrainstormRiskCausesInput - The input type for the brainstormRiskCauses function.
 * - BrainstormRiskCausesOutput - The return type for the brainstormRiskCauses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RiskCategory, RiskSource } from '@/lib/types';
import { RISK_SOURCES, RISK_CATEGORIES } from '@/lib/types';

// Schema is no longer exported
const BrainstormRiskCausesInputSchema = z.object({
  potentialRiskDescription: z
    .string()
    .describe('Deskripsi potensi risiko yang akan dianalisis penyebabnya.'),
  potentialRiskCategory: z.custom<RiskCategory>().nullable()
    .describe('Kategori dari potensi risiko (opsional, untuk konteks tambahan).'),
  goalDescription: z
    .string()
    .describe('Deskripsi sasaran terkait untuk memberikan konteks keseluruhan.'),
  desiredCount: z
    .number()
    .optional()
    .describe('Jumlah saran penyebab risiko yang diinginkan (misalnya 3-7).'),
});
export type BrainstormRiskCausesInput = z.infer<typeof BrainstormRiskCausesInputSchema>;

const RiskCauseSuggestionSchema = z.object({
  description: z.string().describe('Deskripsi singkat dari saran penyebab risiko.'),
  source: z.custom<RiskSource>().nullable().describe('Saran sumber penyebab risiko (Internal atau Eksternal), atau null jika tidak dapat ditentukan dengan pasti.'),
});

// Schema is no longer exported
const BrainstormRiskCausesOutputSchema = z.object({
  suggestedCauses: z
    .array(RiskCauseSuggestionSchema)
    .describe('Daftar saran penyebab risiko, masing-masing dengan deskripsi dan sumbernya.'),
});
export type BrainstormRiskCausesOutput = z.infer<typeof BrainstormRiskCausesOutputSchema>;

export async function brainstormRiskCauses(
  input: BrainstormRiskCausesInput
): Promise<BrainstormRiskCausesOutput> {
  return brainstormRiskCausesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'brainstormRiskCausesPrompt',
  input: {schema: BrainstormRiskCausesInputSchema},
  output: {schema: BrainstormRiskCausesOutputSchema},
  prompt: (input: BrainstormRiskCausesInput) => {
    const availableRiskCategories = RISK_CATEGORIES.join(', ');
    const availableRiskSources = RISK_SOURCES.join(', ');
    let promptText = `Anda adalah seorang ahli manajemen risiko. Tugas Anda adalah melakukan brainstorming kemungkinan penyebab untuk potensi risiko berikut, menggunakan pendekatan diagram Fishbone (Ishikawa).
Untuk setiap penyebab yang diidentifikasi, berikan deskripsi singkat dan tentukan apakah sumbernya 'Internal' atau 'Eksternal' dari daftar berikut: ${availableRiskSources}. Jika sumber tidak dapat ditentukan dengan pasti, kembalikan null untuk sumber.
Pastikan semua deskripsi penyebab dan saran sumber menggunakan Bahasa Indonesia. Output harus dalam format JSON yang sesuai dengan skema output.

Konteks Potensi Risiko:
- Deskripsi Potensi Risiko: "${input.potentialRiskDescription}"
${input.potentialRiskCategory ? `- Kategori Potensi Risiko: "${input.potentialRiskCategory}" (Kategori yang tersedia: ${availableRiskCategories})` : ''}
- Deskripsi Sasaran Terkait: "${input.goalDescription}"

Pertimbangkan kategori-kategori umum dalam diagram Fishbone saat mengidentifikasi penyebab, seperti:
1.  Manusia/SDM (People): Keahlian, pelatihan, kompetensi, kelelahan, motivasi.
2.  Metode/Proses (Process): Prosedur standar, instruksi kerja, kebijakan, alur kerja.
3.  Mesin/Teknologi/Sistem (Machine/Technology/System): Peralatan, perangkat lunak, infrastruktur TI, kegagalan sistem.
4.  Material/Data/Informasi (Material/Data): Kualitas bahan baku, ketersediaan data, integritas informasi.
5.  Lingkungan (Milieu/Environment): Kondisi kerja, faktor eksternal (regulasi, pasar, bencana alam), budaya organisasi.
6.  Manajemen (Management): Perencanaan, pengawasan, komunikasi, pengambilan keputusan.
`;

    if (input.desiredCount && input.desiredCount > 0) {
      promptText += `\nHarap hasilkan tepat ${input.desiredCount} saran penyebab risiko yang berbeda.`;
    } else {
      promptText += `\nHarap hasilkan daftar sekitar 3-5 saran penyebab risiko yang berbeda.`;
    }
    promptText += `\n\nContoh format JSON untuk setiap item dalam array 'suggestedCauses': { "description": "deskripsi penyebab...", "source": "Internal" }`;
    return promptText;
  }
});

const brainstormRiskCausesFlow = ai.defineFlow(
  {
    name: 'brainstormRiskCausesFlow',
    inputSchema: BrainstormRiskCausesInputSchema,
    outputSchema: BrainstormRiskCausesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && Array.isArray(output.suggestedCauses)) {
      // Validate sources
      const validatedCauses = output.suggestedCauses.map(cause => ({
        ...cause,
        source: cause.source && RISK_SOURCES.includes(cause.source as RiskSource) ? cause.source : null,
      }));
      return { suggestedCauses: validatedCauses };
    }
    console.warn("AI output for risk cause suggestions was not in the expected format.");
    return { suggestedCauses: [] };
  }
);
