
'use server';

/**
 * @fileOverview Implements a flow to generate a test paper based on topics and paper style.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

// Input Schema
const GenerateTestPaperInputSchema = z.object({
  subjectName: z.string().describe("The name of the subject for the test."),
  className: z.string().describe("The name of the class for which the test is being created."),
  topics: z.array(z.string()).describe("An array of topics to be covered in the test."),
  paperStyle: z.enum(['multiple_choice', 'short_answer', 'mixed']).describe("The desired style of the paper."),
});
export type GenerateTestPaperInput = z.infer<typeof GenerateTestPaperInputSchema>;

// Output Schema
const QuestionSchema = z.object({
  questionText: z.string().describe("The full text of the question."),
  options: z.array(z.string()).optional().describe("An array of options for multiple-choice questions."),
  answer: z.string().describe("The correct answer to the question."),
});

const GenerateTestPaperOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe("An array of generated questions for the test."),
});
export type GenerateTestPaperOutput = z.infer<typeof GenerateTestPaperOutputSchema>;


export async function generateTestPaper(input: GenerateTestPaperInput): Promise<GenerateTestPaperOutput> {
  return generateTestPaperFlow(input);
}


const testPaperGenerationPrompt = ai.definePrompt({
  name: 'testPaperGenerationPrompt',
  input: { schema: GenerateTestPaperInputSchema },
  output: { schema: GenerateTestPaperOutputSchema },
  prompt: `You are an expert educator and exam creator for a university. Your task is to generate a weekly test paper with 5 questions.

The test is for the subject: **{{{subjectName}}}** for the class **{{{className}}}**.

Cover the following topics:
{{#each topics}}
- {{{this}}}
{{/each}}

The paper style must be: **{{{paperStyle}}}**.
- If 'multiple_choice', generate 5 MCQs with 4 options each.
- If 'short_answer', generate 5 short theoretical questions.
- If 'mixed', generate 3 MCQs and 2 short answer questions.

For each question, provide the question text, options (if applicable), and the correct answer. Ensure the questions are relevant to the topics and appropriate for a university-level weekly test.
`,
});


const generateTestPaperFlow = ai.defineFlow(
  {
    name: 'generateTestPaperFlow',
    inputSchema: GenerateTestPaperInputSchema,
    outputSchema: GenerateTestPaperOutputSchema,
  },
  async (input) => {
    const { output } = await testPaperGenerationPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate the test paper.');
    }
    return output;
  }
);
