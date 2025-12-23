
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
const IDLE_GAP_PENALTY = 50; // Increased penalty for gaps
const PARTIAL_DAY_PENALTY = 20; // Penalty for having a day with very few classes
const CLASSROOM_CHANGE_PENALTY = 15; // Increased penalty for classroom changes

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

    const assignedSlotsForClass = new Map<string, Set<string>>(); // classId -> Set<"day-time">
    let librarySlotsAssigned = 0;
    const maxLibrarySlots = 3;

    // Designate a random "Code Chef" day
    const codeChefDay = input.days[Math.floor(Math.random() * input.days.length)];
    const codeChefSubjectId = 'CODECHEF';

    // Populate the schedule with Code Chef day first
    input.classes.forEach(cls => {
        lectureSlots.forEach(time => {
            const classroom = input.classrooms[Math.floor(Math.random() * input.classrooms.length)];
             const faculty = input.faculty[Math.floor(Math.random() * input.faculty.length)];
            individual.push({
                day: codeChefDay,
                time,
                classId: cls.id,
                subjectId: codeChefSubjectId,
                facultyId: faculty.id, // Placeholder
                classroomId: classroom.id, // Placeholder
                isLab: false,
                isCodeChef: true,
            });

             if (!assignedSlotsForClass.has(cls.id)) assignedSlotsForClass.set(cls.id, new Set());
             assignedSlotsForClass.get(cls.id)!.add(`${codeChefDay}-${time}`);
        });
    });

    while (lectureQueue.length > 0) {
        const lecture = lectureQueue.shift()!;
        const requiredClassroomType = lecture.isLab ? 'lab' : 'classroom';
        const availableClassrooms = input.classrooms.filter(c => c.type === requiredClassroomType);

        if (availableClassrooms.length === 0) continue; 
        const classroom = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)];

        let placed = false;
        for(let i = 0; i < 100; i++) { // Try to place for a while
            const workingDays = input.days.filter(d => d !== codeChefDay);
            if (workingDays.length === 0) break; // Should not happen with 5 days
            const day = workingDays[Math.floor(Math.random() * workingDays.length)];
            
            if (lecture.isLab) {
                // Lab placement for 2 continuous hours
                const validLabPairs: string[][] = [];
                for(let j=0; j < lectureSlots.length - 1; j++) {
                    validLabPairs.push([lectureSlots[j], lectureSlots[j+1]]);
                }
                const pair = validLabPairs[Math.floor(Math.random() * validLabPairs.length)];
                
                const slotKey1 = `${day}-${pair[0]}`;
                const slotKey2 = `${day}-${pair[1]}`;

                if (!assignedSlotsForClass.has(lecture.classId)) assignedSlotsForClass.set(lecture.classId, new Set());

                if (!assignedSlotsForClass.get(lecture.classId)!.has(slotKey1) && !assignedSlotsForClass.get(lecture.classId)!.has(slotKey2)) {
                    const labPartnerIndex = lectureQueue.findIndex(l => l.subjectId === lecture.subjectId && l.batch === lecture.batch);
                    if (labPartnerIndex !== -1) {
                         const partnerLecture = lectureQueue.splice(labPartnerIndex, 1)[0];
                         individual.push({ day, time: pair[0], ...lecture, classroomId: classroom.id });
                         individual.push({ day, time: pair[1], ...partnerLecture, classroomId: classroom.id });
                         assignedSlotsForClass.get(lecture.classId)!.add(slotKey1);
                         assignedSlotsForClass.get(lecture.classId)!.add(slotKey2);
                         placed = true;
                         break;
                    }
                }
            } else {
                // Theory lecture placement
                const time = lectureSlots[Math.floor(Math.random() * lectureSlots.length)];
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
        if(!placed) lectureQueue.push(lecture);
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
        const labBatchTracker = new Map<string, Set<string>>();

        genesInSlot.forEach(gene => {
            if (gene.isCodeChef) return; // Ignore code chef slots for conflict checks
            if (facultyIds.has(gene.facultyId)) fitness += HARD_CONSTRAINT_PENALTY;
            facultyIds.add(gene.facultyId);
            if (classroomIds.has(gene.classroomId)) fitness += HARD_CONSTRAINT_PENALTY;
            classroomIds.add(gene.classroomId);
            if(gene.isLab && gene.batch) {
                const key = `${gene.classId}-${gene.subjectId}`;
                if (!labBatchTracker.has(key)) labBatchTracker.set(key, new Set());
                labBatchTracker.get(key)!.add(gene.batch);
            }
        });
        labBatchTracker.forEach(batches => {
            if(batches.size > 1) fitness += HARD_CONSTRAINT_PENALTY;
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

        // Classroom Consistency for continuous lectures
        dayScheduleMap.forEach((lecturesOnDay) => {
             const sortedLectures = lecturesOnDay.sort((a, b) => input.timeSlots.indexOf(a.time) - input.timeSlots.indexOf(b.time));
             for(let i=0; i < sortedLectures.length - 1; i++) {
                 const currentLec = sortedLectures[i];
                 const nextLec = sortedLectures[i+1];
                 const timeIndexCurrent = input.timeSlots.indexOf(currentLec.time);
                 const timeIndexNext = input.timeSlots.indexOf(nextLec.time);

                 if(timeIndexNext - timeIndexCurrent === 1 && !currentLec.isLab && !nextLec.isLab) { // Are they consecutive?
                     if(currentLec.classroomId !== nextLec.classroomId) {
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
        let gene1 = newChromosome[geneIndex1];

        // Ensure we don't mutate code chef or lab slots for simplicity in this mutation
        if(gene1.isCodeChef || gene1.isLab) return newChromosome;
        
        const workingDays = input.days.filter(d => d !== gene1.day && !newChromosome.some(g => g.isCodeChef && g.day === d));
        if (workingDays.length === 0) return newChromosome;

        const newDay = workingDays[Math.floor(Math.random() * workingDays.length)];
        const newTime = lectureSlots[Math.floor(Math.random() * lectureSlots.length)];
        
        newChromosome[geneIndex1].day = newDay;
        newChromosome[geneIndex1].time = newTime;
    }
    return newChromosome;
}


/**
 * Performs crossover between two parent chromosomes.
 */
function crossover(parent1: Chromosome, parent2: Chromosome): Chromosome[] {
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child1Genes: Gene[] = [];
    const child2Genes: Gene[] = [];

    const parent1Map = new Map(parent1.map(g => [`${g.classId}-${g.subjectId}-${g.day}-${g.time}`, g]));
    const parent2Map = new Map(parent2.map(g => [`${g.classId}-${g.subjectId}-${g.day}-${g.time}`, g]));

    for (let i = 0; i < parent1.length; i++) {
        if (i < crossoverPoint) {
            child1Genes.push(parent1[i]);
            child2Genes.push(parent2[i]);
        } else {
            child1Genes.push(parent2[i]);
            child2Genes.push(parent1[i]);
        }
    }
    
    // Naive crossover, might produce invalid schedules but fitness function will penalize them.
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
