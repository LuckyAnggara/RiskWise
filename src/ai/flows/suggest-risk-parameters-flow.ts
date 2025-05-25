
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
  riskCategory: z.custom<RiskCategory>().nullable().describe('Kategori potensi risiko (Kebijakan, Hukum, Reputasi, Kepatuhan, Keuangan, Fraud, Operasional).'),
  riskCauseDescription: z.string().optional().describe('Deskripsi penyebab risiko (jika berlaku, untuk analisis penyebab).'),
  goalDescription: z.string().describe('Deskripsi sasaran terkait.'),
});
export type SuggestRiskParametersInput = z.infer<typeof SuggestRiskParametersInputSchema>;

const SuggestRiskParametersOutputSchema = z.object({
  suggestedLikelihood: z.custom<LikelihoodImpactLevel>().nullable().describe('Saran level kemungkinan (Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi).'),
  likelihoodJustification: z.string().describe('Justifikasi AI untuk saran level kemungkinan dalam Bahasa Indonesia.'),
  suggestedImpact: z.custom<LikelihoodImpactLevel>().nullable().describe('Saran level dampak (Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi).'),
  impactJustification: z.string().describe('Justifikasi AI untuk saran level dampak dalam Bahasa Indonesia.'),
});
export type SuggestRiskParametersOutput = z.infer<typeof SuggestRiskParametersOutputSchema>;


// Helper function to prepare context for the prompt
function getGuidanceText(input: SuggestRiskParametersInput): string {
  const isCauseAnalysis = !!input.riskCauseDescription;
  const riskTargetDescription = isCauseAnalysis ? input.riskCauseDescription : input.potentialRiskDescription;

  let guidance = `
Anda adalah seorang ahli manajemen risiko. Tugas Anda adalah memberikan saran level Kemungkinan dan Dampak beserta justifikasinya untuk sebuah risiko atau penyebab risiko.
Pastikan semua justifikasi dan penjelasan yang Anda berikan menggunakan Bahasa Indonesia yang baik dan benar.
Output harus dalam format JSON yang sesuai dengan skema output.

Konteks Risiko:
- Target Analisis: "${riskTargetDescription}"
- Kategori Potensi Risiko Terkait: ${input.riskCategory || 'Tidak ditentukan'}
- Sasaran Terkait: "${input.goalDescription}"`;

  if (isCauseAnalysis) {
    guidance += `
- Ini adalah analisis untuk PENYEBAB RISIKO dari potensi risiko: "${input.potentialRiskDescription}"`;
  } else {
    guidance += `
- Ini adalah analisis untuk POTENSI RISIKO inheren (sebelum kontrol atau analisis penyebab detail).`;
  }

  guidance += `

Level yang tersedia untuk Kemungkinan dan Dampak adalah: ${LIKELIHOOD_IMPACT_LEVELS.join(', ')}.

PANDUAN PENENTUAN KEMUNGKINAN:
Pilih salah satu metode yang paling sesuai dengan konteks risiko yang diberikan dan jelaskan pilihan Anda dalam justifikasi.
1.  Berdasarkan Persentase Kemungkinan Terjadi (jika populasi jelas):
    Tingkat keterjadian (x) = (jumlah kejadian / total aktivitas atau populasi) * 100%
    - Sangat Rendah (1): x ≤ 5%
    - Rendah (2): 5% < x ≤ 10%
    - Sedang (3): 10% < x ≤ 20%
    - Tinggi (4): 20% < x ≤ 50%
    - Sangat Tinggi (5): x > 50%
    Dalam justifikasi, sebutkan jika Anda menggunakan metode ini dan, jika mungkin, berikan estimasi populasi dan jumlah kejadian.

2.  Berdasarkan Jumlah Frekuensi Kemungkinan Terjadi (jika populasi tidak jelas atau untuk estimasi kualitatif):
    Frekuensi dalam 1 tahun:
    - Sangat Rendah (1): Sangat Jarang (<2 kali dalam setahun)
    - Rendah (2): Jarang (2–5 kali dalam setahun)
    - Sedang (3): Cukup Sering (6–9 kali dalam setahun)
    - Tinggi (4): Sering (10–12 kali dalam setahun)
    - Sangat Tinggi (5): Sangat Sering (>12 kali dalam setahun)
    Dalam justifikasi, sebutkan jika Anda menggunakan metode ini dan alasan pemilihan frekuensi.

PANDUAN PENENTUAN DAMPAK:
Gunakan kategori potensi risiko ("${input.riskCategory || 'Tidak ditentukan'}") untuk memilih area dampak yang paling relevan.
1.  Risiko Standar Kinerja (biasanya untuk kategori Operasional, Kepatuhan, Reputasi, Hukum, Kebijakan, atau kategori umum):
    Tentukan level dampak berdasarkan potensi pengaruh pada salah satu atau kombinasi area berikut:
    -   Penurunan Reputasi:
        -   (1) Jumlah pengaduan internal/eksternal ≤ 5
        -   (2) Jumlah pengaduan 6-10
        -   (3) Jumlah pengaduan > 10
        -   (4) Pemberitaan negatif sesuai fakta
        -   (5) Pemberitaan negatif viral nasional/internasional
    -   Realisasi Capaian Kinerja:
        -   (1) Capaian >90% s.d <100%
        -   (2) Capaian >85% s.d 90%
        -   (3) Capaian >80% s.d 85%
        -   (4) Capaian ≥75% s.d 80%
        -   (5) Capaian <75%
    -   Gangguan Terhadap Layanan Organisasi:
        -   (1) Gangguan operasional layanan s.d 1 jam
        -   (2) Gangguan >1 s.d 3 jam
        -   (3) Gangguan >3 s.d 6 jam
        -   (4) Gangguan >6 s.d 12 jam
        -   (5) Gangguan >12 jam

2.  Risiko Fraud (jika kategori risiko adalah 'Fraud'):
    -   Fraud Non Kerugian Keuangan Negara (gratifikasi, pungli non-APBN):
        -   (4) ≤100jt
        -   (5) >100jt
        (Untuk level 1-3, pertimbangkan dampak ke reputasi atau capaian kinerja jika tidak ada kerugian finansial langsung yang signifikan)
    -   Fraud Kerugian Keuangan Negara (penggelapan, penyalahgunaan anggaran):
        -   (1) Kerugian ≤0,01% dari total anggaran non belanja Pegawai pada UPR
        -   (2) Kerugian >0,01% s.d 0,1% dari total anggaran non belanja Pegawai pada UPR
        -   (3) Kerugian >0,1% s.d 1% dari total anggaran non belanja Pegawai pada UPR
        -   (4) Kerugian >1% s.d 5% dari total anggaran non belanja Pegawai pada UPR
        -   (5) Kerugian >5% dari total anggaran non belanja Pegawai pada UPR
    -   Fraud Non Keuangan (menguntungkan pelaku/kelompok secara non-finansial): Tentukan dampak berdasarkan area "Penurunan Reputasi" atau "Realisasi Capaian Kinerja" di atas.

3.  Risiko Keuangan (jika kategori risiko adalah 'Keuangan', bukan Fraud):
    Tentukan level dampak berdasarkan area "Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Inspektorat":
    -   (1) Tidak ada temuan
    -   (2) Ada temuan administratif
    -   (3) Ada temuan pengembalian uang/penyimpangan s.d 0,1% dari total anggaran
    -   (4) Ada temuan pengembalian uang/penyimpangan >0,1% s.d 1% dari total anggaran
    -   (5) Ada temuan pengembalian uang/penyimpangan >1% dari total anggaran

Pertimbangkan semua informasi ini untuk memberikan saran yang paling relevan.
Jelaskan dalam justifikasi Anda bagaimana Anda sampai pada kesimpulan tersebut berdasarkan panduan di atas dan konteks risiko yang diberikan.
Jika informasi kurang untuk membuat penentuan yang akurat, nyatakan hal tersebut dalam justifikasi dan berikan saran 'Sedang' atau null untuk levelnya.
`;
  return guidance;
}


const suggestRiskParamsPrompt = ai.definePrompt({
  name: 'suggestRiskParametersPrompt',
  input: { schema: SuggestRiskParametersInputSchema },
  output: { schema: SuggestRiskParametersOutputSchema },
  prompt: getGuidanceText // Menggunakan fungsi helper yang menerima input
});

export const suggestRiskParametersFlow = ai.defineFlow(
  {
    name: 'suggestRiskParametersFlow',
    inputSchema: SuggestRiskParametersInputSchema,
    outputSchema: SuggestRiskParametersOutputSchema,
  },
  async (input) => {
    const llmResponse = await suggestRiskParamsPrompt(input); // Pass input ke prompt
    const output = llmResponse.output();

    if (!output) {
        console.warn("AI output for risk parameter suggestion was not in the expected format.");
        return {
            suggestedLikelihood: null,
            likelihoodJustification: "AI tidak dapat memberikan saran level kemungkinan berdasarkan informasi yang diberikan.",
            suggestedImpact: null,
            impactJustification: "AI tidak dapat memberikan saran level dampak berdasarkan informasi yang diberikan."
        };
    }
    
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

