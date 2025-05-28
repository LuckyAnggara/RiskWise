
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
import {
  brainstormRiskCauses as brainstormRiskCausesFlow,
  type BrainstormRiskCausesInput,
  type BrainstormRiskCausesOutput,
} from "@/ai/flows/brainstorm-risk-causes-flow";
import {
  suggestKriAndTolerance as suggestKriToleranceFlow,
  type SuggestKriToleranceInput,
  type SuggestKriToleranceOutput,
} from "@/ai/flows/suggest-kri-tolerance-flow"; // Impor flow baru
import { z } from "zod";
import type { RiskCategory, RiskSource } from "@/lib/types";
import { RISK_CATEGORIES, RISK_SOURCES } from "@/lib/types";


const BrainstormPotentialRisksActionInputSchema = z.object({
  goalDescription: z.string().min(10, "Deskripsi sasaran minimal 10 karakter."),
  desiredCount: z.number().positive("Jumlah harus lebih dari 0").max(10, "Maksimal 10 saran.").optional(),
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in brainstormPotentialRisksAction:", errorMessage);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in suggestRiskParametersAction:", errorMessage);
    return { 
        success: false, 
        error: `Gagal mendapatkan saran parameter risiko dari AI: ${errorMessage}`
    };
  }
}

const BrainstormRiskCausesActionInputZodSchema = z.object({
  potentialRiskDescription: z.string().min(5, "Deskripsi potensi risiko minimal 5 karakter untuk brainstorming penyebab."),
  potentialRiskCategory: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val as RiskCategory), {
    message: "Kategori risiko tidak valid untuk konteks brainstorming penyebab.",
  }),
  goalDescription: z.string().min(5, "Deskripsi sasaran minimal 5 karakter untuk konteks brainstorming penyebab."),
  desiredCount: z.number().positive("Jumlah harus lebih dari 0").max(7, "Maksimal 7 saran penyebab.").optional(),
});


export async function brainstormRiskCausesAction(
  values: z.infer<typeof BrainstormRiskCausesActionInputZodSchema>
): Promise<{ success: boolean; data?: BrainstormRiskCausesOutput; error?: string }> {
  const validatedFields = BrainstormRiskCausesActionInputZodSchema.safeParse(values);

  if (!validatedFields.success) {
    let errorMessages = "";
    for (const fieldError of Object.values(validatedFields.error.flatten().fieldErrors)) {
        if (fieldError && fieldError.length > 0) {
            errorMessages += fieldError.join(", ") + " ";
        }
    }
    return {
      success: false,
      error: errorMessages.trim() || "Input tidak valid untuk brainstorming penyebab risiko.",
    };
  }

  try {
    const input: BrainstormRiskCausesInput = {
      potentialRiskDescription: validatedFields.data.potentialRiskDescription,
      potentialRiskCategory: validatedFields.data.potentialRiskCategory,
      goalDescription: validatedFields.data.goalDescription,
      desiredCount: validatedFields.data.desiredCount,
    };
    const output = await brainstormRiskCausesFlow(input);
    return { success: true, data: output };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in brainstormRiskCausesAction:", errorMessage);
    return { success: false, error: "Gagal melakukan brainstorming penyebab risiko. Silakan coba lagi." };
  }
}

// Schema for SuggestKriTolerance Action
const SuggestKriToleranceActionInputSchema = z.object({
  riskCauseDescription: z.string().min(5, "Deskripsi penyebab risiko minimal 5 karakter."),
  potentialRiskDescription: z.string().min(5, "Deskripsi potensi risiko induk minimal 5 karakter."),
  riskCategory: z.custom<RiskCategory>().nullable().refine(val => val === null || RISK_CATEGORIES.includes(val as RiskCategory), {
    message: "Kategori risiko tidak valid.",
  }),
  goalDescription: z.string().min(5, "Deskripsi sasaran minimal 5 karakter."),
});

export async function suggestKriToleranceAction(
  values: z.infer<typeof SuggestKriToleranceActionInputSchema>
): Promise<{ success: boolean; data?: SuggestKriToleranceOutput; error?: string }> {
  const validatedFields = SuggestKriToleranceActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    let errorMessages = "";
    for (const fieldError of Object.values(validatedFields.error.flatten().fieldErrors)) {
        if (fieldError && fieldError.length > 0) {
            errorMessages += fieldError.join(", ") + " ";
        }
    }
    return {
      success: false,
      error: errorMessages.trim() || "Input tidak valid untuk saran KRI/Toleransi.",
    };
  }

  try {
    const input: SuggestKriToleranceInput = {
      riskCauseDescription: validatedFields.data.riskCauseDescription,
      potentialRiskDescription: validatedFields.data.potentialRiskDescription,
      riskCategory: validatedFields.data.riskCategory,
      goalDescription: validatedFields.data.goalDescription,
    };
    const output = await suggestKriToleranceFlow(input);
    return { success: true, data: output };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in suggestKriToleranceAction:", errorMessage);
    return { 
        success: false, 
        error: `Gagal mendapatkan saran KRI/Toleransi dari AI: ${errorMessage}`
    };
  }
}
