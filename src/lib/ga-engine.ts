
'use server';

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
    batch?: 'A' | 'B';
}

type Chromosome = Gene[];

interface Lecture {
    classId: string;
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    batch?: 'A' | 'B';
}

// --- Fitness & Penalties ---
const HARD_CONSTRAINT_PENALTY = 1000;
const SOFT_CONSTRAINT_PENALTY = 10;
const IDLE_GAP_PENALTY = 50; // Increased penalty for gaps
const PARTIAL_DAY_PENALTY = 20; // Penalty for having a day with very few classes

// Define valid lab slot pairs
const VALID_LAB_SLOT_PAIRS: string[][] = [
    ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'], // Slots 1 & 2
    ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'], // Slots 3 & 4
    ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'], // Slots 5 & 6
];


/**
 * Pre-processes the input data to create a list of all required lecture slots.
 */
function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    input.classes.forEach(cls => {
        const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
        
        classSubjects.forEach(sub => {
            const facultyForSubject = input.faculty.find(f => f.allottedSubjects && f.allottedSubjects.includes(sub.id));
            if (!facultyForSubject) return;

            if (sub.type.toLowerCase() === 'lab') {
                // Labs are 2 hours per session, and we need sessions for Batch A and Batch B
                // So, for each 2-hour lab requirement, we create two genes for batch A and two for batch B.
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'A' });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'A' });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'B' });
                lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, batch: 'B' });
            } else {
                 // Theory is 3 hours per week
                for(let i=0; i<3; i++) lectures.push({ classId: cls.id, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: false });
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
    const lectureQueue = [...lectures];

    const assignedSlotsForClass = new Map<string, Set<string>>(); // classId -> Set<"day-time">

    while (lectureQueue.length > 0) {
        const lecture = lectureQueue.shift()!;
        const requiredClassroomType = lecture.isLab ? 'lab' : 'classroom';
        const availableClassrooms = input.classrooms.filter(c => c.type === requiredClassroomType);

        if (availableClassrooms.length === 0) continue; 
        const classroom = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)];

        let placed = false;
        // Try to place for a while, then give up on this attempt
        for(let i = 0; i < 100; i++) {
            if (lecture.isLab) {
                // Try to place a 2-hour lab block
                const day = input.days[Math.floor(Math.random() * input.days.length)];
                const pair = VALID_LAB_SLOT_PAIRS[Math.floor(Math.random() * VALID_LAB_SLOT_PAIRS.length)];
                
                const slotKey1 = `${day}-${pair[0]}`;
                const slotKey2 = `${day}-${pair[1]}`;

                if (!assignedSlotsForClass.has(lecture.classId)) assignedSlotsForClass.set(lecture.classId, new Set());

                if (!assignedSlotsForClass.get(lecture.classId)!.has(slotKey1) && !assignedSlotsForClass.get(lecture.classId)!.has(slotKey2)) {
                    // We found a free block for this class. Place both genes.
                    const labPartner = lectureQueue.findIndex(l => l.subjectId === lecture.subjectId && l.batch === lecture.batch);
                    if (labPartner !== -1) {
                         const partnerLecture = lectureQueue.splice(labPartner, 1)[0];
                         individual.push({ day, time: pair[0], ...lecture, classroomId: classroom.id });
                         individual.push({ day, time: pair[1], ...partnerLecture, classroomId: classroom.id });
                         assignedSlotsForClass.get(lecture.classId)!.add(slotKey1);
                         assignedSlotsForClass.get(lecture.classId)!.add(slotKey2);
                         placed = true;
                         break;
                    }
                }
            } else {
                // Place a 1-hour theory lecture
                const day = input.days[Math.floor(Math.random() * input.days.length)];
                const time = input.timeSlots.filter(t => !t.toLowerCase().includes('recess'))[Math.floor(Math.random() * (input.timeSlots.length - 2))];
                const slotKey = `${day}-${time}`;

                if (!assignedSlotsForClass.has(lecture.classId)) assignedSlotsForClass.set(lecture.classId, new Set());
                
                if (!assignedSlotsForClass.get(lecture.classId)!.has(slotKey)) {
                    individual.push({ day, time, ...lecture, classroomId: classroom.id });
                    assignedSlotsForClass.get(lecture.classId)!.add(slotKey);
                    placed = true;
                    break;
                }
            }
        }
        if(!placed) {
            // Could not place, put it back in the queue to try later
            lectureQueue.push(lecture);
        }
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
        const key = `${gene.day}-${gene.time}`;
        if (!timeSlotMap.has(key)) timeSlotMap.set(key, []);
        timeSlotMap.get(key)!.push(gene);
    });

    // HARD CONSTRAINTS
    timeSlotMap.forEach(genesInSlot => {
        const facultyIds = new Set();
        const classroomIds = new Set();
        const labBatchTracker = new Map<string, Set<string>>(); // key: classId-subjectId, value: Set<'A' | 'B'>

        genesInSlot.forEach(gene => {
            // 1. Faculty conflict
            if (facultyIds.has(gene.facultyId)) fitness += HARD_CONSTRAINT_PENALTY;
            facultyIds.add(gene.facultyId);

            // 2. Classroom conflict
            if (classroomIds.has(gene.classroomId)) fitness += HARD_CONSTRAINT_PENALTY;
            classroomIds.add(gene.classroomId);

            // Lab batch conflict: Check if two different batches of the same lab are at the same time
            if(gene.isLab && gene.batch) {
                const key = `${gene.classId}-${gene.subjectId}`;
                if (!labBatchTracker.has(key)) labBatchTracker.set(key, new Set());
                labBatchTracker.get(key)!.add(gene.batch);
            }
        });
        
        labBatchTracker.forEach(batches => {
            if(batches.size > 1) fitness += HARD_CONSTRAINT_PENALTY; // e.g., Batch A and B of same lab at same time
        });
    });

    // Check lab pairing and continuity
    const labsByClassSubBatch = new Map<string, Gene[]>();
    chromosome.filter(g => g.isLab).forEach(lab => {
        const key = `${lab.classId}-${lab.subjectId}-${lab.batch}`;
        if(!labsByClassSubBatch.has(key)) labsByClassSubBatch.set(key, []);
        labsByClassSubBatch.get(key)!.push(lab);
    });
    
    labsByClassSubBatch.forEach(labs => {
        if(labs.length !== 2) {
            fitness += HARD_CONSTRAINT_PENALTY; // Should be exactly 2 hours
            return;
        }
        const [lab1, lab2] = labs;
        if(lab1.day !== lab2.day) {
             fitness += HARD_CONSTRAINT_PENALTY; // Must be on the same day
             return;
        }
        
        const isPairValid = VALID_LAB_SLOT_PAIRS.some(pair => 
            (pair[0] === lab1.time && pair[1] === lab2.time) ||
            (pair[1] === lab1.time && pair[0] === lab2.time)
        );

        if(!isPairValid) {
            fitness += HARD_CONSTRAINT_PENALTY; // Not in a valid consecutive pair
        }
    });


    // SOFT CONSTRAINTS
    input.classes.forEach(cls => {
        const classSchedule = chromosome.filter(g => g.classId === cls.id);
        const dailyLectures = new Map<string, Gene[]>();
        
        classSchedule.forEach(gene => {
            if (!dailyLectures.has(gene.day)) dailyLectures.set(gene.day, []);
            dailyLectures.get(gene.day)!.push(gene);
        });

        let idleDays = input.days.length - dailyLectures.size;
        if (idleDays === 1) {
            fitness -= SOFT_CONSTRAINT_PENALTY * 10; // Big reward for one idle day
        }

        dailyLectures.forEach((lecturesOnDay, day) => {
             // Idle Gaps Penalty
            const timeSlots = input.timeSlots.filter(t => !t.toLowerCase().includes('recess'));
            const dayScheduleIndexes = lecturesOnDay.map(g => timeSlots.indexOf(g.time)).sort((a,b) => a-b);
            if (dayScheduleIndexes.length > 1) {
                for (let i = 0; i < dayScheduleIndexes.length - 1; i++) {
                    const gap = dayScheduleIndexes[i+1] - dayScheduleIndexes[i];
                    if (gap > 1) {
                        fitness += IDLE_GAP_PENALTY * (gap - 1);
                    }
                }
            }
            // Partially filled day penalty
            if(dayScheduleIndexes.length > 0 && dayScheduleIndexes.length < 4) {
                fitness += PARTIAL_DAY_PENALTY;
            }
        });

        // Classroom Consistency Penalty
        const uniqueClassrooms = new Set(classSchedule.map(g => g.classroomId)).size;
        if (uniqueClassrooms > 1) {
            fitness += SOFT_CONSTRAINT_PENALTY * (uniqueClassrooms - 1);
        }
    });

    return fitness;
}

/**
 * Performs mutation on a chromosome.
 */
function mutate(chromosome: Chromosome): Chromosome {
    const newChromosome = JSON.parse(JSON.stringify(chromosome));
    
    for (let i = 0; i < newChromosome.length; i++) {
        if (Math.random() < MUTATION_RATE) {
            const j = Math.floor(Math.random() * newChromosome.length);
            // Simple swap of two random genes' positions
            [newChromosome[i].day, newChromosome[j].day] = [newChromosome[j].day, newChromosome[i].day];
            [newChromosome[i].time, newChromosome[j].time] = [newChromosome[j].time, newChromosome[i].time];
        }
    }
    return newChromosome;
}

/**
 * Performs crossover between two parent chromosomes.
 */
function crossover(parent1: Chromosome, parent2: Chromosome): Chromosome[] {
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)];
    const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)];
    return [child1, child2];
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

   const requiredLabSlots = lectures.filter(l => l.isLab).length;
   const availableLabSlots = input.classrooms.filter(c => c.type === 'lab').length * input.days.length * VALID_LAB_SLOT_PAIRS.length;
   if (requiredLabSlots > availableLabSlots * 2) { // x2 because each slot pair takes 2 genes
       return `Not enough lab classroom slots available. Required: ${requiredLabSlots / 2} 2-hour lab blocks, but only ${availableLabSlots} are possible in the schedule. Please add more lab classrooms.`;
   }
   
   return null;
}


// --- Main GA Runner ---
export async function runGA(input: GenerateTimetableInput) {
    const lectures = createLectureList(input);

    const impossibilityReason = checkImpossibility(lectures, input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: null, generations: 0, fitness: -1 };
    }

    let population = Array.from({ length: POPULATION_SIZE }, () => createIndividual(lectures, input));

    if(input.existingSchedule && input.existingSchedule.length > 0) {
        // Seed the population with the existing schedule for stability
        const seedChromosome = input.existingSchedule.filter(
            slot => input.classes.some(c => c.id === slot.classId)
        ) as Chromosome;
        if(seedChromosome.length > 0) population[0] = seedChromosome;
    }

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
            newPopulation.push(mutate(child1));
            if (newPopulation.length < POPULATION_SIZE) {
                newPopulation.push(mutate(child2));
            }
        }
        population = newPopulation;
    }

    if (bestFitness >= HARD_CONSTRAINT_PENALTY) {
         return { success: false, message: `Could not find a conflict-free schedule after ${MAX_GENERATIONS} generations. The best found schedule still had hard constraint violations. This may be due to overly restrictive constraints (e.g., not enough faculty or classrooms).`, bestTimetable: null, generations: MAX_GENERATIONS, fitness: bestFitness };
    }

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness };
}
