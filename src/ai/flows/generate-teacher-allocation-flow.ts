
'use server';

import { ai } from '@/ai/genkit';
import { GenerateTeacherAllocationInputSchema, GenerateTeacherAllocationOutputSchema, type GenerateTeacherAllocationInput, type GenerateTeacherAllocationOutput } from '@/lib/types';

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export const generateTeacherAllocationFlow = ai.defineFlow(
  {
    name: 'generateTeacherAllocationFlow',
    inputSchema: GenerateTeacherAllocationInputSchema,
    outputSchema: GenerateTeacherAllocationOutputSchema,
  },
  async (input): Promise<GenerateTeacherAllocationOutput> => {
    const { subjects, classes, faculty } = input;
    const allocation: GenerateTeacherAllocationOutput = {};

    for (const subject of subjects) {
        const teachersForSubject = faculty.filter(f => f.allottedSubjects?.includes(subject.id));
        const numTeachers = teachersForSubject.length;
        const numSections = classes.length;

        if (numTeachers === 0) {
            allocation[subject.name] = { 'No Teacher Assigned': classes.map(c => c.name) };
            continue;
        }

        const shuffledTeachers = shuffleArray(teachersForSubject);
        let shuffledSections = shuffleArray(classes.map(c => c.name));
        const subjectAllocation: Record<string, string[]> = {};

        if (numSections % numTeachers !== 0) {
            // Handle uneven distribution
            const baseWorkload = Math.floor(numSections / numTeachers);
            const remainder = numSections % numTeachers;
            
            const workloads: { [teacherId: string]: number } = {};
            shuffledTeachers.forEach(t => workloads[t.id] = baseWorkload);
            for (let i = 0; i < remainder; i++) {
                workloads[shuffledTeachers[i].id]++;
            }
            
            for (const teacher of shuffledTeachers) {
                const sectionsToAssign = shuffledSections.splice(0, workloads[teacher.id]);
                subjectAllocation[teacher.name] = sectionsToAssign;
            }
        } else {
            // Handle even distribution
            const workload = numSections / numTeachers;
            for (const teacher of shuffledTeachers) {
                const sectionsToAssign = shuffledSections.splice(0, workload);
                subjectAllocation[teacher.name] = sectionsToAssign;
            }
        }
        allocation[subject.name] = subjectAllocation;
    }

    return allocation;
  }
);
