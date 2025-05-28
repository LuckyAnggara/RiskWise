
'use server';
/**
 * @fileOverview A Genkit flow to suggest Control Measures based on risk cause analysis.
 *
 * - suggestControlMeasures - A function that provides AI-driven suggestions for control measures.
 * - SuggestControlMeasuresInput - Input type for the flow.
 * - SuggestControlMeasuresOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ControlMeasureTypeKey, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS } from '@/lib/types';

const SuggestControlMeasuresInputSchema = z.object({
  riskCauseDescription: z.string().describe('Deskripsi penyebab risiko yang akan disusun rencana pengendaliannya.'),
  parentPotentialRiskDescription: z.string().describe('Deskripsi potensi risiko induk dari penyebab ini.'),
  grandParentGoalDescription: z.string().describe('Deskripsi sasaran terkait untuk memberikan konteks keseluruhan.'),
  riskCauseLevelText: z.custom<CalculatedRiskLevelCategory | 'N/A'>().describe('Tingkat risiko dari penyebab yang dianalisis (misalnya, "Tinggi", "Sedang", "N/A").'),
  riskCauseLikelihood: z.custom<LikelihoodLevelDesc>().nullable().describe('Level kemungkinan terjadinya penyebab risiko.'),
  riskCauseImpact: z.custom<ImpactLevelDesc>().nullable().describe('Level dampak jika penyebab risiko terjadi.'),
  desiredSuggestionCount: z.number().optional().default(3).describe('Jumlah saran tindakan pengendalian yang diinginkan (maksimal 3).'),
});
export type SuggestControlMeasuresInput = z.infer<typeof SuggestControlMeasuresInputSchema>;

const ControlMeasureSuggestionSchema = z.object({
  description: z.string().describe('Deskripsi singkat dari saran tindakan pengendalian risiko dalam Bahasa Indonesia.'),
  suggestedControlType: z.custom<ControlMeasureTypeKey>().describe(`Saran tipe pengendalian dari daftar: ${CONTROL_MEASURE_TYPE_KEYS.join(', ')} (Prv, RM, Crr).`),
  justification: z.string().describe('Justifikasi atau alasan mengapa tindakan pengendalian dan tipenya tersebut disarankan, dalam Bahasa Indonesia.'),
});

const SuggestControlMeasuresOutputSchema = z.object({
  suggestions: z.array(ControlMeasureSuggestionSchema).describe('Daftar saran tindakan pengendalian risiko.'),
});
export type SuggestControlMeasuresOutput = z.infer<typeof SuggestControlMeasuresOutputSchema>;

export async function suggestControlMeasures(
  input: SuggestControlMeasuresInput
): Promise<SuggestControlMeasuresOutput> {
  return suggestControlMeasuresFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestControlMeasuresPrompt',
  input: { schema: SuggestControlMeasuresInputSchema },
  output: { schema: SuggestControlMeasuresOutputSchema },
  prompt: (input: SuggestControlMeasuresInput) => {
    const controlTypeGuidance = () => {
      switch (input.riskCauseLevelText) {
        case 'Sangat Tinggi':
        case 'Tinggi':
          return "Karena tingkat risiko penyebab adalah '" + input.riskCauseLevelText + "', fokus pada kombinasi tindakan Preventif (Prv), Mitigasi Risiko (RM), dan Korektif (Crr).";
        case 'Sedang':
          return "Karena tingkat risiko penyebab adalah 'Sedang', fokus pada tindakan Preventif (Prv) dan Mitigasi Risiko (RM).";
        case 'Rendah':
        case 'Sangat Rendah':
          return "Karena tingkat risiko penyebab adalah '" + input.riskCauseLevelText + "', fokus utama pada tindakan Preventif (Prv).";
        default:
          return "Tingkat risiko penyebab belum ditentukan, berikan saran pengendalian umum yang mungkin efektif.";
      }
    };

    return `
Anda adalah seorang ahli manajemen risiko berpengalaman. Tugas Anda adalah memberikan saran tindakan pengendalian risiko yang relevan berdasarkan konteks penyebab risiko dan hasil analisisnya.
Pastikan semua saran dan justifikasi menggunakan Bahasa Indonesia yang baik dan benar.

Konteks Analisis Penyebab Risiko:
- Deskripsi Sasaran Terkait: "${input.grandParentGoalDescription}"
- Deskripsi Potensi Risiko Induk: "${input.parentPotentialRiskDescription}"
- Deskripsi Penyebab Risiko: "${input.riskCauseDescription}"
- Hasil Analisis Tingkat Risiko Penyebab: "${input.riskCauseLevelText}" (Kemungkinan: ${input.riskCauseLikelihood || 'Belum dianalisis'}, Dampak: ${input.riskCauseImpact || 'Belum dianalisis'})

Panduan Tipe Pengendalian Berdasarkan Tingkat Risiko:
${controlTypeGuidance()}

Tipe pengendalian yang tersedia:
- Preventif (Prv): Upaya pencegahan yang dilakukan sebelum Risiko terjadi.
- Mitigasi Risiko (RM): Upaya pengendalian Risiko yang dilakukan saat Risiko terjadi untuk meminimalisir dampak.
- Korektif (Crr): Upaya yang dilakukan untuk memastikan Risiko yang sama tidak terjadi kembali.

Untuk Penyebab Risiko di atas:
1. Sarankan hingga ${input.desiredSuggestionCount} tindakan pengendalian yang spesifik dan dapat diimplementasikan.
2. Untuk setiap saran, tentukan tipe pengendalian yang paling sesuai (Prv, RM, atau Crr).
3. Berikan justifikasi singkat mengapa tindakan pengendalian dan tipenya tersebut penting dan relevan.

Contoh output untuk satu saran dalam array 'suggestions':
{
  "description": "Melakukan sosialisasi kebijakan baru secara berkala kepada seluruh unit kerja.",
  "suggestedControlType": "Prv",
  "justification": "Sosialisasi preventif penting untuk memastikan pemahaman dan kepatuhan terhadap kebijakan baru, mengurangi risiko ketidaksesuaian."
}

Harap hasilkan output dalam format JSON yang sesuai dengan skema output yang diberikan.
Pastikan semua nilai string dalam Bahasa Indonesia.
`;
  },
});

const suggestControlMeasuresFlow = ai.defineFlow(
  {
    name: 'suggestControlMeasuresFlow',
    inputSchema: SuggestControlMeasuresInputSchema,
    outputSchema: SuggestControlMeasuresOutputSchema,
  },
  async (input) => {
    const llmResponse = await prompt(input);
    const output = llmResponse.output;

    if (!output || !Array.isArray(output.suggestions)) {
      console.warn("[suggestControlMeasuresFlow] AI output for control measure suggestions was not in the expected format or was null.");
      return { suggestions: [] };
    }
    
    const validatedSuggestions = output.suggestions.filter(
      s => CONTROL_MEASURE_TYPE_KEYS.includes(s.suggestedControlType as ControlMeasureTypeKey) && s.description && s.justification
    );

    return { suggestions: validatedSuggestions };
  }
);
