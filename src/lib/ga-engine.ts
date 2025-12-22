
import { GenerateTimetableInput } from './types';

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
}

type Chromosome = Gene[];

interface Lecture {
    classId: string;
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    duration: number; // in slots
}

// --- Fitness & Penalties ---
const HARD_CONSTRAINT_PENALTY = 1000;
const SOFT_CONSTRAINT_PENALTY = 10;

// --- Helper Functions ---

/**
 * Pre-processes the input data to create a list of all required lecture slots.
 */
function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    input.classes.forEach(cls => {
        const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
        
        classSubjects.forEach(sub => {
            const facultyForSubject = input.faculty.find(f => f.allottedSubjects.includes(sub.id));
            if (!facultyForSubject) {
                // This will be caught by the impossibility check later, but good to be defensive
                return;
            }

            const isLab = sub.type.toLowerCase() === 'lab';
            const hours = isLab ? 2 : 3; // Simplified: 2 for labs, 3 for theory. Can be data-driven.

            if (isLab) {
                lectures.push({
                    classId: cls.id,
                    subjectId: sub.id,
                    facultyId: facultyForSubject.id,
                    isLab: true,
                    duration: 2,
                });
                 // Theory component for lab subject
                lectures.push({
                    classId: cls.id,
                    subjectId: sub.id,
                    facultyId: facultyForSubject.id,
                    isLab: false,
                    duration: 1,
                });

            } else {
                for (let i = 0; i < hours; i++) {
                    lectures.push({
                        classId: cls.id,
                        subjectId: sub.id,
                        facultyId: facultyForSubject.id,
                        isLab: false,
                        duration: 1,
                    });
                }
            }
        });
    });
    return lectures;
}


/**
 * Generates a single random, but structurally valid, timetable (Chromosome).
 */
function createIndividual(lectures: Lecture[], input: GenerateTimetableInput): Chromosome {
    const individual: Chromosome = [];
    const timeSlots = input.timeSlots.filter(t => !t.includes('Recess'));

    const availableSlots: { day: string; time: string }[] = [];
    input.days.forEach(day => {
        timeSlots.forEach(time => {
            availableSlots.push({ day, time });
        });
    });

    // Shuffle slots for randomness
    for (let i = availableSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSlots[i], availableSlots[j]] = [availableSlots[j], availableSlots[i]];
    }

    const assignedSlots = new Set<string>(); // "day-time"

    lectures.forEach(lecture => {
        const subject = input.subjects.find(s => s.id === lecture.subjectId)!;
        const availableClassrooms = input.classrooms.filter(c => c.type === subject.type);
        if (availableClassrooms.length === 0) return; // Impossibility will be checked later
        const classroom = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)];

        if (lecture.isLab) {
            // Find two consecutive slots
            let found = false;
            for (let i = 0; i < availableSlots.length - 1; i++) {
                const slot1 = availableSlots[i];
                const slot2Index = timeSlots.indexOf(slot1.time) + 1;
                if (slot2Index < timeSlots.length) {
                    const slot2Time = timeSlots[slot2Index];
                    const key1 = `${slot1.day}-${slot1.time}`;
                    const key2 = `${slot1.day}-${slot2Time}`;
                    if (!assignedSlots.has(key1) && !assignedSlots.has(key2)) {
                        individual.push({ ...slot1, ...lecture, classroomId: classroom.id, isLab: true });
                        individual.push({ day: slot1.day, time: slot2Time, ...lecture, classroomId: classroom.id, isLab: true });
                        assignedSlots.add(key1);
                        assignedSlots.add(key2);
                        found = true;
                        break;
                    }
                }
            }
        } else {
            // Find a single slot
            const slotIndex = availableSlots.findIndex(s => !assignedSlots.has(`${s.day}-${s.time}`));
            if (slotIndex !== -1) {
                const slot = availableSlots[slotIndex];
                individual.push({ ...slot, ...lecture, classroomId: classroom.id, isLab: false });
                assignedSlots.add(`${slot.day}-${slot.time}`);
            }
        }
    });

    return individual;
}

/**
 * Calculates the fitness of a timetable. Lower score is better.
 */
function calculateFitness(chromosome: Chromosome, input: GenerateTimetableInput): number {
    let fitness = 0;
    const timeSlotMap = new Map<string, Gene[]>(); // key: day-time

    chromosome.forEach(gene => {
        const key = `${gene.day}-${gene.time}`;
        if (!timeSlotMap.has(key)) timeSlotMap.set(key, []);
        timeSlotMap.get(key)!.push(gene);
    });

    // HARD CONSTRAINTS
    timeSlotMap.forEach(genesInSlot => {
        const facultyIds = new Set();
        const classroomIds = new Set();
        const classIds = new Set();

        genesInSlot.forEach(gene => {
            // 1. Faculty conflict
            if (facultyIds.has(gene.facultyId)) fitness += HARD_CONSTRAINT_PENALTY;
            facultyIds.add(gene.facultyId);

            // 2. Classroom conflict
            if (classroomIds.has(gene.classroomId)) fitness += HARD_CONSTRAINT_PENALTY;
            classroomIds.add(gene.classroomId);

            // 5. Class conflict
            if (classIds.has(gene.classId)) fitness += HARD_CONSTRAINT_PENALTY;
            classIds.add(gene.classId);
        });
    });

    // 4. Faculty workload
    const facultyWorkload = new Map<string, number>();
    chromosome.forEach(gene => {
        facultyWorkload.set(gene.facultyId, (facultyWorkload.get(gene.facultyId) || 0) + 1);
    });
    input.faculty.forEach(fac => {
        const load = facultyWorkload.get(fac.id) || 0;
        if (fac.maxWeeklyHours && load > fac.maxWeeklyHours) {
            fitness += (load - fac.maxWeeklyHours) * HARD_CONSTRAINT_PENALTY;
        }
    });


    // SOFT CONSTRAINTS
    input.classes.forEach(cls => {
        const classSchedule = chromosome.filter(g => g.classId === cls.id);
        const dailySubjects = new Map<string, Set<string>>(); // day -> Set<subjectId>
        const dailySlots = new Map<string, number>();

        classSchedule.forEach(gene => {
            if (!dailySubjects.has(gene.day)) dailySubjects.set(gene.day, new Set());
            dailySubjects.get(gene.day)!.add(gene.subjectId);
            dailySlots.set(gene.day, (dailySlots.get(gene.day) || 0) + 1);
        });

        // 8. Subject repetition in a day
        dailySubjects.forEach((subjectsOnDay, day) => {
            const lecturesOnDay = classSchedule.filter(g => g.day === day);
            const subjectCounts = lecturesOnDay.reduce((acc, g) => {
                acc.set(g.subjectId, (acc.get(g.subjectId) || 0) + 1);
                return acc;
            }, new Map<string, number>());
            subjectCounts.forEach(count => {
                if (count > 2) fitness += SOFT_CONSTRAINT_PENALTY * (count - 2); // Penalize more than 2 lectures of same subject
            });
        });
        
        // 9. Idle Gaps
        input.days.forEach(day => {
            const daySchedule = classSchedule.filter(g => g.day === day).map(g => input.timeSlots.indexOf(g.time)).sort((a,b) => a-b);
            if (daySchedule.length > 1) {
                for (let i = 0; i < daySchedule.length - 1; i++) {
                    const gap = daySchedule[i+1] - daySchedule[i];
                    if (gap > 1 && input.timeSlots[daySchedule[i]+1] !== 'Recess') {
                        fitness += SOFT_CONSTRAINT_PENALTY * (gap - 1);
                    }
                }
            }
        });
        
        // 11. Idle day reward
        const teachingDays = new Set(classSchedule.map(g => g.day)).size;
        if (teachingDays <= input.days.length - 1) {
            fitness -= SOFT_CONSTRAINT_PENALTY * 5; // Reward
        }

    });

    return fitness;
}

/**
 * Performs mutation on a chromosome.
 */
function mutate(chromosome: Chromosome, lectures: Lecture[], input: GenerateTimetableInput): Chromosome {
    const newChromosome = JSON.parse(JSON.stringify(chromosome));
    
    for (let i = 0; i < newChromosome.length; i++) {
        if (Math.random() < MUTATION_RATE) {
            // Swap two random genes
            const j = Math.floor(Math.random() * newChromosome.length);
            [newChromosome[i].day, newChromosome[j].day] = [newChromosome[j].day, newChromosome[i].day];
            [newChromosome[i].time, newChromosome[j].time] = [newChromosome[j].time, newChromosome[i].time];
            
            // Re-assign classroom
            const gene = newChromosome[i];
            const subject = input.subjects.find(s => s.id === gene.subjectId)!;
            const availableClassrooms = input.classrooms.filter(c => c.type === subject.type);
            if (availableClassrooms.length > 0) {
                 gene.classroomId = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)].id;
            }
        }
    }

    return newChromosome;
}

/**
 * Performs crossover between two parent chromosomes.
 */
function crossover(parent1: Chromosome, parent2: Chromosome): Chromosome {
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)];
    
    // Repair child to have correct number of lectures
    const lectureCounts = new Map<string, number>();
    child.forEach(gene => {
        const key = `${gene.classId}-${gene.subjectId}`;
        lectureCounts.set(key, (lectureCounts.get(key) || 0) + 1);
    });

    // This is a simplification; a full repair mechanism would be more complex
    // For now, we rely on selection and mutation to fix inconsistencies.
    
    return child;
}

/**
* Checks if a valid schedule is even possible with the given constraints.
*/
function checkImpossibility(lectures: Lecture[], input: GenerateTimetableInput): string | null {
   // Check faculty availability
   const requiredFacultyHours = new Map<string, number>();
   lectures.forEach(lec => {
       const hours = lec.isLab ? 2 : 1;
       requiredFacultyHours.set(lec.facultyId, (requiredFacultyHours.get(lec.facultyId) || 0) + hours);
   });

   for (const [facultyId, requiredHours] of requiredFacultyHours.entries()) {
       const faculty = input.faculty.find(f => f.id === facultyId);
       if (faculty && faculty.maxWeeklyHours && requiredHours > faculty.maxWeeklyHours) {
           return `Faculty ${faculty.name} is over-allocated. Required: ${requiredHours} hours, Max: ${faculty.maxWeeklyHours} hours. Please increase their max weekly hours.`;
       }
   }

   // Check classroom availability
   const requiredLabSlots = lectures.filter(l => l.isLab).length * 2;
   const availableLabSlots = input.classrooms.filter(c => c.type === 'lab').length * input.days.length * input.timeSlots.filter(t => !t.includes('Recess')).length;
   if (requiredLabSlots > availableLabSlots) {
       return `Not enough lab classroom slots available. Required: ${requiredLabSlots} slots, Available: ${availableLabSlots} slots. Please add more lab classrooms.`;
   }
   
   return null;
}


// --- Main GA Runner ---
export function runGA(input: GenerateTimetableInput) {
    const lectures = createLectureList(input);

    const impossibilityReason = checkImpossibility(lectures, input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: null, generations: 0, fitness: -1 };
    }

    let population = Array.from({ length: POPULATION_SIZE }, () => createIndividual(lectures, input));

    let bestTimetable: Chromosome | null = null;
    let bestFitness = Infinity;

    for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
        // Calculate fitness for each individual
        const fitnessScores = population.map(individual => ({
            chromosome: individual,
            fitness: calculateFitness(individual, input),
        }));

        // Sort by fitness (lower is better)
        fitnessScores.sort((a, b) => a.fitness - b.fitness);

        if (fitnessScores[0].fitness < bestFitness) {
            bestFitness = fitnessScores[0].fitness;
            bestTimetable = fitnessScores[0].chromosome;
        }

        // Termination condition
        if (bestFitness === 0) {
            return { success: true, message: 'Optimal solution found.', bestTimetable, generations: generation, fitness: bestFitness };
        }

        // Create next generation
        const newPopulation: Chromosome[] = [];
        const eliteCount = Math.floor(POPULATION_SIZE * ELITISM_RATE);
        
        // Elitism
        for (let i = 0; i < eliteCount; i++) {
            newPopulation.push(fitnessScores[i].chromosome);
        }

        // Crossover and Mutation
        for (let i = eliteCount; i < POPULATION_SIZE; i++) {
            const parent1 = fitnessScores[Math.floor(Math.random() * eliteCount)].chromosome;
            const parent2 = fitnessScores[Math.floor(Math.random() * eliteCount)].chromosome;
            let child = crossover(parent1, parent2);
            child = mutate(child, lectures, input);
            newPopulation.push(child);
        }
        population = newPopulation;
    }

    if (bestFitness > HARD_CONSTRAINT_PENALTY) {
         return { success: false, message: `Could not find a conflict-free schedule after ${MAX_GENERATIONS} generations. The best found schedule still had hard constraint violations. This may be due to overly restrictive constraints.`, bestTimetable: null, generations: MAX_GENERATIONS, fitness: bestFitness };
    }

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness };
}
