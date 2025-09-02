
'use server';

import { generateCrest, type GenerateCrestInput, type GenerateCrestOutput } from '@/ai/flows/generate-crest-flow';

export async function handleGenerateCrest(input: GenerateCrestInput): Promise<GenerateCrestOutput> {
    try {
        const result = await generateCrest(input);
        return result;
    } catch(e: any) {
        console.error("Crest generation failed: ", e);
        // Return a fallback or error indicator
        return { crestDataUri: '' };
    }
}
