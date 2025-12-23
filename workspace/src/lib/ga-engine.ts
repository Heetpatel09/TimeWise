
'use server';

import { GenerateTimetableInput, type SubjectPriority } from './types';

// --- Core GA Configuration ---
const POPULATION_SIZE = 100;
const MAX_GENERATIONS = 500;
const ELITISM_RATE = 0.1; // Keep top 10%
const MUTATION_RATE = 0.2; // 20% chance for a chromosome to mutate

// --- Data Structures ---
interface Gene {
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    isCodeChef?: boolean;
    batch?: 'A' | 'B';
}

type Chromosome = Gene[];

interface Lecture {
    classId: string;
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    priorityValue: number;
    batch?: 'A' | 'B';
}

// --- Fitness & Penalties ---
const HARD_CONSTRAINT_PENALTY = 1000;
const SOFT_CONSTRAINT_PENALTY = 10;
const CLASSROOM_CHANGE_PENALTY = 50; // Increased penalty for classroom changes for continuous lectures

const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3; // Default to 3 hours if not specified
    }
};

const getPriorityValue = (priority?: SubjectPriority): number => {
     switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2; 
    }
}

/**
 * Pre-processes the input data to create a list of all required lecture slots.
 */
function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    input.classes.forEach(cls => {
        const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
        
        classSubjects.forEach(sub => {
            const facultyForSubject = input.faculty.find(f => f.allottedSubjects && f.allottedSubjects.includes(sub.id));
            if (!facultyForSubject) {
                console.warn(`No faculty found for subject ${sub.name} (${sub.id})`);
                return;
            }

            const priorityValue = getPriorityValue(sub.priority);

            if (sub.type.toLowerCase() === 'lab') {
                // Labs are 2 hours per session, and we need sessions for Batch A and Batch B.
                 // Each batch gets one 2-hour lab session, so we add 2 genes per batch.
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'A', priorityValue });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'A', priorityValue });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'B', priorityValue });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'B', priorityValue });
            } else {
                 const hours = getHoursForPriority(sub.priority);
                 for(let i = 0; i < hours; i++) {
                    lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: false, priorityValue });
                 }
            }
        });
    });

    // Sort lectures by priority so higher priority subjects are placed first
    lectures.sort((a, b) => b.priorityValue - a.priorityValue);
    return lectures;
}


/**
 * Generates a single random, but structurally valid, timetable (Chromosome).
 */
function createIndividual(lectures: Lecture[], input: GenerateTimetableInput, lectureSlots: string[]): Chromosome {
    const individual: Chromosome = [];
    const lectureQueue = [...lectures];
    const workingDays = [...input.days];

    // Designate a random "Code Chef" day and remove it from working days
    const codeChefDayIndex = Math.floor(Math.random() * workingDays.length);
    const codeChefDay = workingDays.splice(codeChefDayIndex, 1)[0];
    const codeChefSubjectId = 'CODECHEF'; // A placeholder ID

    // Populate the schedule with Code Chef day first
    input.classes.forEach(cls => {
        lectureSlots.forEach(time => {
            const faculty = input.faculty[Math.floor(Math.random() * input.faculty.length)];
            // Classroom is intentionally left generic or unassigned for CodeChef day
            individual.push({
                day: codeChefDay,
                time,
                classId: cls.id,
                subjectId: codeChefSubjectId,
                facultyId: faculty.id,
                classroomId: 'flexible-room', // Use a placeholder
                isLab: false,
                isCodeChef: true,
            });
        });
    });

    // Create a map to track used slots for each class
    const classTimeSlots = new Map<string, Set<string>>(); // key: classId, value: Set of "day-time"
    input.classes.forEach(cls => classTimeSlots.set(cls.id, new Set()));

    // Fill the remaining working days with lectures
    while (lectureQueue.length > 0) {
        const lecture = lectureQueue.shift()!;
        const requiredClassroomType = lecture.isLab ? 'lab' : 'classroom';
        const availableClassrooms = input.classrooms.filter(c => c.type === requiredClassroomType);

        if (availableClassrooms.length === 0) continue;
        const classroom = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)];
        
        let placed = false;
        for (let i = 0; i < 100; i++) { // Limit attempts to prevent infinite loops
            const day = workingDays[Math.floor(Math.random() * workingDays.length)];
            const time = lectureSlots[Math.floor(Math.random() * lectureSlots.length)];
            const slotKey = `${day}-${time}`;

            if (!classTimeSlots.get(lecture.classId)!.has(slotKey)) {
                individual.push({ day, time, ...lecture, classroomId: classroom.id });
                classTimeSlots.get(lecture.classId)!.add(slotKey);
                placed = true;
                break;
            }
        }
        if (!placed) lectureQueue.push(lecture); // Add back to queue if not placed
    }

    return individual;
}

/**
 * Calculates the fitness of a timetable. Lower score is better.
 */
function calculateFitness(chromosome: Chromosome, input: GenerateTimetableInput): number {
    let fitness = 0;
    const timeSlotMap = new Map<string, Gene[]>(); // key: day-time

    chromosome.forEach(gene => {
        if (gene.isCodeChef) return; // Exclude Code Chef day from conflict checks
        const key = `${gene.day}-${gene.time}`;
        if (!timeSlotMap.has(key)) timeSlotMap.set(key, []);
        timeSlotMap.get(key)!.push(gene);
    });

    // HARD CONSTRAINTS
    timeSlotMap.forEach(genesInSlot => {
        const facultyIds = new Set<string>();
        const classroomIds = new Set<string>();
        const classIds = new Set<string>();

        genesInSlot.forEach(gene => {
            if (facultyIds.has(gene.facultyId)) fitness += HARD_CONSTRAINT_PENALTY;
            facultyIds.add(gene.facultyId);

            if (classroomIds.has(gene.classroomId)) fitness += HARD_CONSTRAINT_PENALTY;
            classroomIds.add(gene.classroomId);

            if (classIds.has(gene.classId)) fitness += HARD_CONSTRAINT_PENALTY;
            classIds.add(gene.classId);
        });
    });

    // SOFT CONSTRAINTS
    input.classes.forEach(cls => {
        const classSchedule = chromosome.filter(g => g.classId === cls.id && !g.isCodeChef);
        const dayScheduleMap = new Map<string, Gene[]>();
        
        classSchedule.forEach(gene => {
            if (!dayScheduleMap.has(gene.day)) dayScheduleMap.set(gene.day, []);
            dayScheduleMap.get(gene.day)!.push(gene);
        });

        // Classroom Consistency for continuous theory lectures
        dayScheduleMap.forEach((lecturesOnDay) => {
             const sortedLectures = lecturesOnDay.sort((a, b) => input.timeSlots.indexOf(a.time) - input.timeSlots.indexOf(b.time));
             for(let i = 0; i < sortedLectures.length - 1; i++) {
                 const currentLec = sortedLectures[i];
                 const nextLec = sortedLectures[i+1];
                 const timeIndexCurrent = input.timeSlots.indexOf(currentLec.time);
                 const timeIndexNext = input.timeSlots.indexOf(nextLec.time);

                 if (timeIndexNext - timeIndexCurrent === 1 && !currentLec.isLab && !nextLec.isLab) {
                     if (currentLec.classroomId !== nextLec.classroomId) {
                         fitness += CLASSROOM_CHANGE_PENALTY;
                     }
                 }
             }
        });
    });

    return fitness;
}


/**
 * Performs mutation on a chromosome.
 */
function mutate(chromosome: Chromosome, input: GenerateTimetableInput, lectureSlots: string[]): Chromosome {
    let newChromosome = JSON.parse(JSON.stringify(chromosome));
    
    if (Math.random() < MUTATION_RATE) {
        const geneIndex1 = Math.floor(Math.random() * newChromosome.length);
        const gene1 = newChromosome[geneIndex1];

        // Ensure we don't mutate code chef or lab slots for simplicity
        if(gene1.isCodeChef || gene1.isLab) return newChromosome;
        
        // Find a day that is not the code chef day
        const codeChefDay = newChromosome.find(g => g.isCodeChef)?.day;
        const workingDays = input.days.filter(d => d !== codeChefDay);
        if (workingDays.length === 0) return newChromosome;

        const newDay = workingDays[Math.floor(Math.random() * workingDays.length)];
        const newTime = lectureSlots[Math.floor(Math.random() * lectureSlots.length)];
        
        // Simple swap mutation
        const geneIndex2 = Math.floor(Math.random() * newChromosome.length);
        const gene2 = newChromosome[geneIndex2];
        if(!gene2.isCodeChef && !gene2.isLab) {
            [newChromosome[geneIndex1].day, newChromosome[geneIndex2].day] = [newChromosome[geneIndex2].day, newChromosome[geneIndex1].day];
            [newChromosome[geneIndex1].time, newChromosome[geneIndex2].time] = [newChromosome[geneIndex2].time, newChromosome[geneIndex1].time];
        }
    }
    return newChromosome;
}


/**
 * Performs crossover between two parent chromosomes.
 */
function crossover(parent1: Chromosome, parent2: Chromosome): Chromosome[] {
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child1Genes: Gene[] = parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint));
    const child2Genes: Gene[] = parent2.slice(0, crossoverPoint).concat(parent1.slice(crossoverPoint));
    
    // This is a naive crossover and might result in invalid schedules (e.g., duplicate lectures).
    // The fitness function will penalize these, and subsequent generations should fix them.
    return [child1Genes, child2Genes];
}


/**
* Checks if a valid schedule is even possible with the given constraints.
*/
function checkImpossibility(lectures: Lecture[], input: GenerateTimetableInput): string | null {
   const subjectsWithoutFaculty = new Set<string>();
   input.classes.forEach(cls => {
       const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
       classSubjects.forEach(sub => {
           const hasFaculty = input.faculty.some(f => f.allottedSubjects && f.allottedSubjects.includes(sub.id));
           if (!hasFaculty) {
               subjectsWithoutFaculty.add(sub.name);
           }
       });
   });

   if (subjectsWithoutFaculty.size > 0) {
       return `The following subjects do not have any faculty assigned to them: ${[...subjectsWithoutFaculty].join(', ')}. Please assign faculty to these subjects.`;
   }

   const requiredFacultyHours = new Map<string, number>();
   lectures.forEach(lec => {
       requiredFacultyHours.set(lec.facultyId, (requiredFacultyHours.get(lec.facultyId) || 0) + 1);
   });

   for (const [facultyId, requiredHours] of requiredFacultyHours.entries()) {
       const faculty = input.faculty.find(f => f.id === facultyId);
       if (faculty && faculty.maxWeeklyHours && requiredHours > faculty.maxWeeklyHours) {
           return `Faculty ${faculty.name} is over-allocated. Required: ${requiredHours} hours, Max: ${faculty.maxWeeklyHours} hours. Please increase their max weekly hours.`;
       }
   }
   
   return null;
}


// --- Main GA Runner ---
export async function runGA(input: GenerateTimetableInput) {
    const lectures = createLectureList(input);
    const lectureSlots = input.timeSlots.filter(t => !t.includes('9:20-9:30') && !t.includes('11:20-12:20'));

    const impossibilityReason = checkImpossibility(lectures, input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: null, generations: 0, fitness: -1 };
    }

    let population = Array.from({ length: POPULATION_SIZE }, () => createIndividual(lectures, input, lectureSlots));

    let bestTimetable: Chromosome | null = null;
    let bestFitness = Infinity;

    for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
        const fitnessScores = population.map(individual => ({
            chromosome: individual,
            fitness: calculateFitness(individual, input),
        }));

        fitnessScores.sort((a, b) => a.fitness - b.fitness);

        if (fitnessScores[0].fitness < bestFitness) {
            bestFitness = fitnessScores[0].fitness;
            bestTimetable = fitnessScores[0].chromosome;
        }

        if (bestFitness === 0) {
            return { success: true, message: 'Optimal solution found.', bestTimetable, generations: generation, fitness: bestFitness };
        }

        const newPopulation: Chromosome[] = [];
        const eliteCount = Math.floor(POPULATION_SIZE * ELITISM_RATE);
        
        for (let i = 0; i < eliteCount; i++) {
            newPopulation.push(fitnessScores[i].chromosome);
        }

        while (newPopulation.length < POPULATION_SIZE) {
            const parent1 = fitnessScores[Math.floor(Math.random() * (population.length / 2))].chromosome;
            const parent2 = fitnessScores[Math.floor(Math.random() * (population.length / 2))].chromosome;
            const [child1, child2] = crossover(parent1, parent2);
            newPopulation.push(mutate(child1, input, lectureSlots));
            if (newPopulation.length < POPULATION_SIZE) {
                newPopulation.push(mutate(child2, input, lectureSlots));
            }
        }
        population = newPopulation;
    }

    if (bestFitness >= HARD_CONSTRAINT_PENALTY) {
         return { success: false, message: `Could not find a conflict-free schedule after ${MAX_GENERATIONS} generations. The best found schedule still had hard constraint violations. This may be due to overly restrictive constraints (e.g., not enough faculty or classrooms).`, bestTimetable: null, generations: MAX_GENERATIONS, fitness: bestFitness };
    }

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness };
}
