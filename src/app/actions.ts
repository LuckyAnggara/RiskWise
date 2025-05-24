
"use server";

import { brainstormPotentialRisks as brainstormPotentialRisksFlow, type BrainstormPotentialRisksInput, type BrainstormPotentialRisksOutput } from "@/ai/flows/brainstorm-risks";
import { z } from "zod";

const BrainstormPotentialRisksActionInputSchema = z.object({
  goalDescription: z.string().min(10, "Goal description must be at least 10 characters long."),
});

export async function brainstormPotentialRisksAction(
  values: z.infer<typeof BrainstormPotentialRisksActionInputSchema>
): Promise<{ success: boolean; data?: BrainstormPotentialRisksOutput; error?: string }> {
  const validatedFields = BrainstormPotentialRisksActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors.goalDescription?.[0] || "Invalid input.",
    };
  }

  try {
    const input: BrainstormPotentialRisksInput = {
      goalDescription: validatedFields.data.goalDescription,
    };
    const output = await brainstormPotentialRisksFlow(input);
    return { success: true, data: output };
  } catch (error) {
    console.error("Error in brainstormPotentialRisksAction:", error);
    return { success: false, error: "Failed to brainstorm potential risks. Please try again." };
  }
}
