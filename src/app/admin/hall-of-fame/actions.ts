
'use server';

import { generateCrest, type GenerateCrestInput, type GenerateCrestOutput } from '@/ai/flows/generate-crest-flow';

export async function handleGenerateCrest(input: GenerateCrestInput): Promise<GenerateCrestOutput> {
    try {
        const result = await generateCrest(input);
        if (!result.crestDataUri) {
            throw new Error("AI failed to return a crest image.");
        }
        return result;
    } catch(e: any) {
        console.error("Crest generation failed: ", e);
        // Return a specific error indicator that the UI can check for.
        return { crestDataUri: 'error' };
    }
}
