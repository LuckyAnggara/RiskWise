
'use server';

/**
 * @fileOverview A Genkit flow to suggest likelihood and impact levels for risks.
 *
 * - suggestRiskParametersFlow - A function that provides AI-driven suggestions for risk parameters.
 * - SuggestRiskParametersInput - Input type for the flow.
 * - SuggestRiskParametersOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { RiskCategory, LikelihoodImpactLevel } from '@/lib/types'; // Import shared types
import { LIKELIHOOD_IMPACT_LEVELS, RISK_CATEGORIES } from '@/lib/types';

const SuggestRiskParametersInputSchema = z.object({
  potentialRiskDescription: z.string().describe('Deskripsi potensi risiko.'),
  riskCategory: z.custom<RiskCategory>().nullable().describe('Kategori potensi risiko (Kebijakan, Fraud, Keuangan, Operasional, dll.).'),
  riskCauseDescription: z.string().optional().describe('Deskripsi penyebab risiko (jika berlaku, untuk analisis penyebab).'),
  goalDescription: z.string().describe('Deskripsi sasaran terkait.'),
});
export type SuggestRiskParametersInput = z.infer<typeof SuggestRiskParametersInputSchema>;

const SuggestRiskParametersOutputSchema = z.object({
  suggestedLikelihood: z.custom<LikelihoodImpactLevel>().nullable().describe('Saran level kemungkinan (Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi).'),
  likelihoodJustification: z.string().describe('Justifikasi AI untuk saran level kemungkinan.'),
  suggestedImpact: z.custom<LikelihoodImpactLevel>().nullable().describe('Saran level dampak (Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi).'),
  impactJustification: z.string().describe('Justifikasi AI untuk saran level dampak.'),
});
export type SuggestRiskParametersOutput = z.infer<typeof SuggestRiskParametersOutputSchema>;


// Helper function to prepare context for the prompt
function getGuidanceText(category: RiskCategory | null, isCauseAnalysis: boolean): string {
  let guidance = `
Anda adalah seorang ahli manajemen risiko. Tugas Anda adalah memberikan saran level Kemungkinan dan Dampak beserta justifikasinya untuk sebuah risiko.
Level yang tersedia untuk Kemungkinan dan Dampak adalah: ${LIKELIHOOD_IMPACT_LEVELS.join(', ')}.
Pastikan semua justifikasi dan penjelasan yang Anda berikan menggunakan Bahasa Indonesia yang baik dan benar.

Konteks Risiko:
- Potensi Risiko: ${SuggestRiskParametersInputSchema.potentialRiskDescription}
- Kategori Risiko: ${category || 'Tidak ditentukan'}
- Sasaran Terkait: {{{goalDescription}}}`;

  if (isCauseAnalysis) {
    guidance += `
- Analisis untuk Penyebab Risiko: {{{riskCauseDescription}}}`;
  } else {
    guidance += `
- Analisis untuk Potensi Risiko Inheren (sebelum kontrol atau analisis penyebab detail).`;
  }

  guidance += `

Panduan Penentuan Dampak:
1. Risiko Standar Kinerja: ditentukan dari area dampak Penurunan Reputasi, Realisasi Capaian Kinerja, dan Gangguan Terhadap Layanan Organisasi.
2. Risiko Fraud:
   - Fraud Non Kerugian Keuangan Negara: untuk kecurangan yang menguntungkan pelaku secara finansial dan tidak merugikan negara (misal, gratifikasi, pungli non-APBN). Area dampak: Fraud (Non Kerugian Negara), atau Penurunan Reputasi/Realisasi Capaian Kinerja jika fraud non-keuangan.
   - Fraud Kerugian Keuangan Negara: untuk kecurangan yang menguntungkan pelaku dan merugikan keuangan negara (misal, penggelapan, penyalahgunaan anggaran). Area dampak: Fraud (Kerugian Negara).
3. Risiko Keuangan: ditentukan dari area dampak temuan hasil pemeriksaan BPK dan hasil pengawasan Inspektorat Jenderal.

Panduan Penentuan Kemungkinan:
1. Persentase kemungkinan terjadi (x): digunakan jika ada populasi yang jelas. Tingkat keterjadian (x) = jumlah kemungkinan / total aktivitas/kegiatan.
   - Sangat Rendah (1): x ≤ 5%
   - Rendah (2): 5% < x ≤ 10%
   - Sedang (3): 10% < x ≤ 20%
   - Tinggi (4): 20% < x ≤ 50%
   - Sangat Tinggi (5): x > 50%
2. Jumlah frekuensi kemungkinan terjadi: digunakan jika populasi tidak dapat ditentukan. Frekuensi dalam 1 tahun:
   - Sangat Rendah (1): Sangat Jarang (<2 kali)
   - Rendah (2): Jarang (2–5 kali)
   - Sedang (3): Cukup sering (6–9 kali)
   - Tinggi (4): Sering (10–12 kali)
   - Sangat Tinggi (5): Sangat sering (>12 kali)

Pertimbangkan semua informasi ini untuk memberikan saran yang paling relevan.
Pastikan justifikasi Anda menjelaskan bagaimana Anda sampai pada kesimpulan tersebut berdasarkan panduan di atas dan konteks risiko yang diberikan, dan sampaikan justifikasi tersebut dalam Bahasa Indonesia.
Output harus dalam format JSON yang sesuai dengan skema output.
Jika informasi kurang untuk membuat penentuan yang akurat, nyatakan hal tersebut dalam justifikasi dan berikan saran 'Sedang' atau 'N/A' (null).
`;
  return guidance;
}


const suggestRiskParamsPrompt = ai.definePrompt({
  name: 'suggestRiskParametersPrompt',
  input: { schema: SuggestRiskParametersInputSchema },
  output: { schema: SuggestRiskParametersOutputSchema },
  prompt: (input: SuggestRiskParametersInput) => {
    const isCauseAnalysis = !!input.riskCauseDescription;
    return getGuidanceText(input.riskCategory, isCauseAnalysis);
  }
});

export const suggestRiskParametersFlow = ai.defineFlow(
  {
    name: 'suggestRiskParametersFlow',
    inputSchema: SuggestRiskParametersInputSchema,
    outputSchema: SuggestRiskParametersOutputSchema,
  },
  async (input) => {
    const llmResponse = await suggestRiskParamsPrompt(input);
    const output = llmResponse.output();

    if (!output) {
        // Fallback or error handling if the LLM output is not as expected
        console.warn("AI output for risk parameter suggestion was not in the expected format.");
        return {
            suggestedLikelihood: null,
            likelihoodJustification: "AI tidak dapat memberikan saran level kemungkinan berdasarkan informasi yang diberikan.",
            suggestedImpact: null,
            impactJustification: "AI tidak dapat memberikan saran level dampak berdasarkan informasi yang diberikan."
        };
    }
    
    // Validate that the suggested levels are within the allowed enum values
    const validatedLikelihood = output.suggestedLikelihood && LIKELIHOOD_IMPACT_LEVELS.includes(output.suggestedLikelihood) ? output.suggestedLikelihood : null;
    const validatedImpact = output.suggestedImpact && LIKELIHOOD_IMPACT_LEVELS.includes(output.suggestedImpact) ? output.suggestedImpact : null;

    return {
        suggestedLikelihood: validatedLikelihood,
        likelihoodJustification: output.likelihoodJustification || "Tidak ada justifikasi tambahan dari AI.",
        suggestedImpact: validatedImpact,
        impactJustification: output.impactJustification || "Tidak ada justifikasi tambahan dari AI."
    };
  }
);

// Exported wrapper function
export async function suggestRiskParameters(
  input: SuggestRiskParametersInput
): Promise<SuggestRiskParametersOutput> {
  return suggestRiskParametersFlow(input);
}

