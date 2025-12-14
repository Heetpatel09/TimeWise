
'use server';
/**
 * @fileoverview A Genkit flow for generating test papers.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TestPaperQuestionSchema = z.object({
  questionText: z.string(),
  answer: z.string(),
  options: z.array(z.string()).optional(),
});

export const GenerateTestPaperInputSchema = z.object({
  subjectName: z.string().describe('The name of the subject.'),
  className: z.string().describe('The name of the class.'),
  topics: z.array(z.string()).describe('A list of topics to be covered.'),
  paperStyle: z
    .enum(['multiple_choice', 'short_answer', 'mixed'])
    .describe('The style of the test paper.'),
});
export type GenerateTestPaperInput = z.infer<
  typeof GenerateTestPaperInputSchema
>;

export const GenerateTestPaperOutputSchema = z.object({
  questions: z.array(TestPaperQuestionSchema),
});
export type GenerateTestPaperOutput = z.infer<
  typeof GenerateTestPaperOutputSchema
>;

export const generateTestPaperFlow = ai.defineFlow(
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
      model: 'googleai/gemini-1.5-flash-preview',
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
