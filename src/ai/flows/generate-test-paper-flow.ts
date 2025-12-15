
'use server';
/**
 * @fileoverview A Genkit flow for generating test papers.
 */

import {ai} from '@/ai/genkit';
import { GenerateTestPaperInputSchema, GenerateTestPaperOutputSchema, type GenerateTestPaperInput, type GenerateTestPaperOutput } from '@/lib/types';


const generateTestPaper = ai.defineFlow(
  {
    name: 'generateTestPaperFlow',
    inputSchema: GenerateTestPaperInputSchema,
    outputSchema: GenerateTestPaperOutputSchema,
  },
  async (input) => {
    const prompt = `Generate 5 test paper questions for the subject "${
      input.subjectName
    }" for the class "${
      input.className
    }". The questions should cover the following topics: ${input.topics.join(
      ', '
    )}.
The paper style should be: ${input.paperStyle}.
For multiple choice questions, provide 4 options.
For all questions, provide the correct answer.
`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'gemini-pro',
      output: {
        schema: GenerateTestPaperOutputSchema,
      },
      config: {
        temperature: 0.8,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateTestPaperFlow(input: GenerateTestPaperInput): Promise<GenerateTestPaperOutput> {
    return generateTestPaper(input);
}
