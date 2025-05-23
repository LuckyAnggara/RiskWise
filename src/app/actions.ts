
"use server";

import { brainstormRisks as brainstormRisksFlow, type BrainstormRisksInput, type BrainstormRisksOutput } from "@/ai/flows/brainstorm-risks";
import { z } from "zod";

const BrainstormRisksActionInputSchema = z.object({
  goalDescription: z.string().min(10, "Goal description must be at least 10 characters long."),
});

export async function brainstormRisksAction(
  values: z.infer<typeof BrainstormRisksActionInputSchema>
): Promise<{ success: boolean; data?: BrainstormRisksOutput; error?: string }> {
  const validatedFields = BrainstormRisksActionInputSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors.goalDescription?.[0] || "Invalid input.",
    };
  }

  try {
    const input: BrainstormRisksInput = {
      goalDescription: validatedFields.data.goalDescription,
    };
    const output = await brainstormRisksFlow(input);
    return { success: true, data: output };
  } catch (error) {
    console.error("Error in brainstormRisksAction:", error);
    return { success: false, error: "Failed to brainstorm risks. Please try again." };
  }
}
