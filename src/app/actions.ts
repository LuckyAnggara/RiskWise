
"use server";

import { 
  brainstormPotentialRisks as brainstormPotentialRisksFlow, 
  type BrainstormPotentialRisksInput, 
  type BrainstormPotentialRisksOutput 
} from "@/ai/flows/brainstorm-risks";
import { 
  suggestRiskParameters as suggestRiskParametersFlow,
  type SuggestRiskParametersInput, 
  type SuggestRiskParametersOutput 
} from "@/ai/flows/suggest-risk-parameters-flow";
import { z } from "zod";
import type { RiskCategory } from "@/lib/types";
import { RISK_CATEGORIES } from "@/lib/types";


const BrainstormPotentialRisksActionInputSchema = z.object({
  goalDescription: z.string().min(10, "Deskripsi sasaran minimal 10 karakter."),
  desiredCount: z.number().optional().positive("Jumlah harus lebih dari 0").max(10, "Maksimal 10 saran."),
});

export async function brainstormPotentialRisksAction(
  values: z.infer<typeof BrainstormPotentialRisksActionInputSchema>
): Promise<{ success: boolean; data?: BrainstormPotentialRisksOutput; error?: string }> {
  const validatedFields = BrainstormPotentialRisksActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    let errorMessages = "";
    for (const fieldError of Object.values(validatedFields.error.flatten().fieldErrors)) {
        if (fieldError && fieldError.length > 0) {
            errorMessages += fieldError.join(", ") + " ";
        }
    }
    return {
      success: false,
      error: errorMessages.trim() || "Input tidak valid.",
    };
  }

  try {
    const input: BrainstormPotentialRisksInput = {
      goalDescription: validatedFields.data.goalDescription,
      desiredCount: validatedFields.data.desiredCount,
    };
    const output = await brainstormPotentialRisksFlow(input);
    return { success: true, data: output };
  } catch (error) {
    console.error("Error in brainstormPotentialRisksAction:", error);
    return { success: false, error: "Gagal melakukan brainstorming potensi risiko. Silakan coba lagi." };
  }
}


// Schema for SuggestRiskParameters Action
const SuggestRiskParametersActionInputSchema = z.object({
  potentialRiskDescription: z.string().min(5, "Deskripsi potensi risiko minimal 5 karakter."),
  riskCategory: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val as RiskCategory), {
    message: "Kategori risiko tidak valid.",
  }),
  riskCauseDescription: z.string().optional(),
  goalDescription: z.string().min(5, "Deskripsi sasaran minimal 5 karakter."),
});


export async function suggestRiskParametersAction(
  values: z.infer<typeof SuggestRiskParametersActionInputSchema>
): Promise<{ success: boolean; data?: SuggestRiskParametersOutput; error?: string }> {
  const validatedFields = SuggestRiskParametersActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    let errorMessages = "";
    for (const fieldError of Object.values(validatedFields.error.flatten().fieldErrors)) {
        if (fieldError && fieldError.length > 0) {
            errorMessages += fieldError.join(", ") + " ";
        }
    }
    return {
      success: false,
      error: errorMessages.trim() || "Input tidak valid untuk saran parameter risiko.",
    };
  }

  try {
    const input: SuggestRiskParametersInput = {
      potentialRiskDescription: validatedFields.data.potentialRiskDescription,
      riskCategory: validatedFields.data.riskCategory,
      riskCauseDescription: validatedFields.data.riskCauseDescription,
      goalDescription: validatedFields.data.goalDescription,
    };
    const output = await suggestRiskParametersFlow(input);
    return { success: true, data: output };
  } catch (error) {
    console.error("Error in suggestRiskParametersAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Gagal mendapatkan saran parameter risiko dari AI. Silakan coba lagi.";
    return { 
        success: false, 
        error: errorMessage
    };
  }
}
