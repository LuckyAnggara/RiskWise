
'use server';
/**
 * @fileOverview A Genkit flow to suggest Key Risk Indicators (KRI) and Risk Tolerances.
 *
 * - suggestKriAndTolerance - A function that provides AI-driven suggestions for KRI and Tolerance.
 * - SuggestKriToleranceInput - Input type for the flow.
 * - SuggestKriToleranceOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { RiskCategory } from '@/lib/types';
import { RISK_CATEGORIES } from '@/lib/types';

const SuggestKriToleranceInputSchema = z.object({
  riskCauseDescription: z.string().describe('Deskripsi penyebab risiko yang akan dianalisis KRI dan Toleransinya.'),
  potentialRiskDescription: z.string().describe('Deskripsi potensi risiko induk dari penyebab ini.'),
  riskCategory: z.custom<RiskCategory>().nullable().describe(`Kategori potensi risiko induk (opsional, untuk konteks tambahan). Kategori yang tersedia: ${RISK_CATEGORIES.join(', ')}`),
  goalDescription: z.string().describe('Deskripsi sasaran terkait untuk memberikan konteks keseluruhan.'),
});
export type SuggestKriToleranceInput = z.infer<typeof SuggestKriToleranceInputSchema>;

const SuggestKriToleranceOutputSchema = z.object({
  suggestedKRI: z.string().describe('Saran Key Risk Indicator (KRI) dalam Bahasa Indonesia.'),
  kriJustification: z.string().describe('Justifikasi atau alasan mengapa KRI tersebut disarankan, dalam Bahasa Indonesia.'),
  suggestedTolerance: z.string().describe('Saran Toleransi Risiko untuk KRI yang disarankan, dalam Bahasa Indonesia.'),
  toleranceJustification: z.string().describe('Justifikasi atau alasan mengapa Toleransi Risiko tersebut disarankan, dalam Bahasa Indonesia.'),
});
export type SuggestKriToleranceOutput = z.infer<typeof SuggestKriToleranceOutputSchema>;

export async function suggestKriAndTolerance(
  input: SuggestKriToleranceInput
): Promise<SuggestKriToleranceOutput> {
  return suggestKriToleranceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestKriTolerancePrompt',
  input: { schema: SuggestKriToleranceInputSchema },
  output: { schema: SuggestKriToleranceOutputSchema },
  prompt: (input: SuggestKriToleranceInput) => `
Anda adalah seorang ahli manajemen risiko berpengalaman. Tugas Anda adalah memberikan saran untuk Key Risk Indicator (KRI) dan Toleransi Risiko yang relevan berdasarkan konteks penyebab risiko yang diberikan.
Pastikan semua saran dan justifikasi menggunakan Bahasa Indonesia yang baik dan benar.

Konteks Analisis:
- Deskripsi Penyebab Risiko: "${input.riskCauseDescription}"
- Deskripsi Potensi Risiko Induk: "${input.potentialRiskDescription}"
- Kategori Potensi Risiko Induk: ${input.riskCategory || 'Tidak ditentukan'}
- Deskripsi Sasaran Terkait: "${input.goalDescription}"

Untuk Penyebab Risiko di atas:
1.  Sarankan satu Key Risk Indicator (KRI) yang spesifik, terukur, dapat dicapai, relevan, dan berbatas waktu (SMART) untuk memantau penyebab risiko tersebut.
2.  Berikan justifikasi singkat mengapa KRI tersebut penting dan relevan.
3.  Sarankan satu Toleransi Risiko yang sesuai untuk KRI yang Anda sarankan. Toleransi ini harus jelas dan memberikan ambang batas yang dapat diterima.
4.  Berikan justifikasi singkat mengapa Toleransi Risiko tersebut dianggap sesuai.

Contoh KRI: "Persentase keterlambatan penyelesaian proyek lebih dari 5 hari kerja."
Contoh Justifikasi KRI: "KRI ini penting untuk memantau efisiensi waktu pelaksanaan proyek yang bisa menjadi penyebab utama kegagalan pencapaian sasaran."
Contoh Toleransi Risiko: "Maksimal 10% dari total proyek boleh mengalami keterlambatan lebih dari 5 hari kerja dalam satu kuartal."
Contoh Justifikasi Toleransi: "Toleransi 10% memberikan ruang untuk kendala minor tanpa mengganggu target keseluruhan, namun tetap menjaga standar kinerja."

Harap hasilkan output dalam format JSON yang sesuai dengan skema output yang diberikan.
Pastikan semua nilai string, termasuk saran KRI, Toleransi, dan justifikasinya, adalah dalam Bahasa Indonesia.
`,
});

const suggestKriToleranceFlow = ai.defineFlow(
  {
    name: 'suggestKriToleranceFlow',
    inputSchema: SuggestKriToleranceInputSchema,
    outputSchema: SuggestKriToleranceOutputSchema,
  },
  async (input) => {
    const llmResponse = await prompt(input);
    const output = llmResponse.output;

    if (!output) {
      console.warn("[suggestKriToleranceFlow] AI output for KRI/Tolerance suggestion was null or undefined.");
      return {
        suggestedKRI: "AI tidak dapat memberikan saran KRI saat ini.",
        kriJustification: "Tidak ada justifikasi dari AI.",
        suggestedTolerance: "AI tidak dapat memberikan saran Toleransi Risiko saat ini.",
        toleranceJustification: "Tidak ada justifikasi dari AI.",
      };
    }
    
    return {
      suggestedKRI: output.suggestedKRI || "Tidak ada saran KRI dari AI.",
      kriJustification: output.kriJustification || "Tidak ada justifikasi KRI dari AI.",
      suggestedTolerance: output.suggestedTolerance || "Tidak ada saran Toleransi dari AI.",
      toleranceJustification: output.toleranceJustification || "Tidak ada justifikasi Toleransi dari AI.",
    };
  }
);
