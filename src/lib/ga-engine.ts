
'use server';

import type { GenerateTimetableInput, Schedule, Subject, SubjectPriority, Faculty } from './types';

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
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    classId: string;
    hours: number;
}

// --- CONFIGURATION ---
const POPULATION_SIZE = 50;
const MAX_GENERATIONS = 200;
const ELITISM_RATE = 0.1;
const MUTATION_RATE = 0.15;

const LAB_SLOT_PAIRS: [number, number][] = [
    [0, 1], // Slots 1 & 2
    [2, 3], // Slots 3 & 4
    [4, 5], // Slots 5 & 6
];

// --- PENALTY VALUES ---
const HARD_PENALTY = 1000;
const SOFT_PENALTY = 10;


// --- HELPER FUNCTIONS ---
const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2;
    }
};

/**
 * Creates a definitive list of all academic and library lectures that need to be scheduled for a class.
 */
function createLectureList(input: GenerateTimetableInput, classId: string): Lecture[] {
    const lectures: Lecture[] = [];
    const classToSchedule = input.classes.find(c => c.id === classId);
    if (!classToSchedule) return [];

    const classSubjects = input.subjects.filter(
        s => s.departmentId === classToSchedule.departmentId && s.semester === classToSchedule.semester
    );
    
    // Labs
    const labSubjects = classSubjects.filter(s => s.type === 'lab');
    for (const sub of labSubjects) {
        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) continue;
        // A lab session is 2 hours long. The class can be split into batches during this time.
        lectures.push({ classId, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: true, hours: 2 });
    }

    // Theory
    const theorySubjects = classSubjects.filter(s => s.type === 'theory' && s.id !== 'LIB001');
    for (const sub of theorySubjects) {
        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) continue;
        const hours = getHoursForPriority(sub.priority);
        for (let i = 0; i < hours; i++) {
            lectures.push({ classId, subjectId: sub.id, facultyId: facultyForSubject.id, isLab: false, hours: 1 });
        }
    }

    // Library
    const librarySubject = input.subjects.find(s => s.id === 'LIB001');
    if (librarySubject) {
        for (let i = 0; i < 3; i++) { // Exactly 3 library slots
            lectures.push({ classId, subjectId: 'LIB001', facultyId: 'FAC_LIB', isLab: false, hours: 1 });
        }
    }
    
    return lectures;
}


/**
 * Runs pre-checks to see if a schedule is even possible.
 */
function runPreChecks(input: GenerateTimetableInput, lectures: Lecture[], workingDays: string[], slots: string[]): string | null {
    const classToSchedule = input.classes[0];
    if (!classToSchedule) return "Internal error: Class data is missing.";

    const subjectsForClass = input.subjects.filter(s => s.departmentId === classToSchedule.departmentId && s.semester === classToSchedule.semester);
    if (subjectsForClass.length === 0) return `No subjects found for Semester ${classToSchedule.semester}. Please add subjects before generating a timetable.`

    const subjectsWithoutFaculty = subjectsForClass.filter(sub => sub.id !== 'LIB001').find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    if (subjectsWithoutFaculty) return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty.`;

    const totalRequiredHours = lectures.reduce((acc, l) => acc + l.hours, 0);
    const totalAvailableSlots = workingDays.length * slots.length;
    if (totalRequiredHours > totalAvailableSlots) return `Cannot generate schedule. Required slots (${totalRequiredHours}) exceed available slots (${totalAvailableSlots}) for a ${workingDays.length}-day week.`;

    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if(theoryClassrooms.length === 0 && lectures.some(l => !l.isLab && l.subjectId !== 'LIB001')) return "Cannot schedule theory classes. No classrooms are available.";

    const labClassrooms = input.classrooms.filter(c => c.type === 'lab');
    if(labClassrooms.length < 1 && lectures.some(l => l.isLab)) return "Cannot schedule labs. At least one lab classroom is required.";

    return null;
}


// --- GENETIC ALGORITHM ---

/**
 * Creates the initial population of random timetables.
 */
function createInitialPopulation(input: GenerateTimetableInput, lectures: Lecture[], workingDays: string[], slots: string[]): Chromosome[] {
    const population: Chromosome[] = [];
    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

    for (let i = 0; i < POPULATION_SIZE; i++) {
        let chromosome: Chromosome = [];
        let availableSlots = workingDays.flatMap(day => slots.map(time => ({ day, time })));
        
        let lecturesToPlace = [...lectures];
        
        // Labs first
        let labLectures = lecturesToPlace.filter(l => l.isLab);

        for (const lab of labLectures) {
             if (labClassrooms.length === 0) continue;
             const dayIndex = Math.floor(Math.random() * workingDays.length);
             const day = workingDays[dayIndex];
             const [slot1Index, slot2Index] = LAB_SLOT_PAIRS[Math.floor(Math.random() * LAB_SLOT_PAIRS.length)];
             const time1 = slots[slot1Index];
             const time2 = slots[slot2Index];
             const room = labClassrooms[Math.floor(Math.random() * labClassrooms.length)];

             chromosome.push({ day, time: time1, ...lab, classroomId: room.id, batch: 'A' });
             chromosome.push({ day, time: time2, ...lab, classroomId: room.id, batch: 'A' });
        }
        
        // Theory & Library
        let theoryLectures = lecturesToPlace.filter(l => !l.isLab);
        availableSlots = availableSlots.filter(s => !chromosome.some(g => g.day === s.day && g.time === s.time));
        
        for (const lecture of theoryLectures) {
            if (availableSlots.length === 0) break;
            const slotIndex = Math.floor(Math.random() * availableSlots.length);
            const { day, time } = availableSlots.splice(slotIndex, 1)[0];
            const classroomId = lecture.subjectId === 'LIB001' ? 'CR_LIB' : theoryClassrooms[Math.floor(Math.random() * theoryClassrooms.length)].id;
            chromosome.push({ day, time, ...lecture, classroomId });
        }
        population.push(chromosome);
    }
    return population;
}

/**
 * Calculates the fitness of a single chromosome. Lower penalty is better.
 */
function calculateFitness(chromosome: Chromosome, input: GenerateTimetableInput): { fitness: number, penalty: number } {
    let penalty = 0;
    const fullSchedule = [...chromosome, ...input.existingSchedule || []];

    // Hard Constraints
    const slots = new Set<string>();
    chromosome.forEach(gene => {
        const slotKey = `${gene.day}-${gene.time}`;
        // Class double booking
        if(slots.has(slotKey)) penalty += HARD_PENALTY;
        slots.add(slotKey);
    });

    for(let i = 0; i < fullSchedule.length; i++) {
        for(let j = i + 1; j < fullSchedule.length; j++) {
            const gene1 = fullSchedule[i];
            const gene2 = fullSchedule[j];
            if (gene1.day === gene2.day && gene1.time === gene2.time) {
                if (gene1.facultyId === gene2.facultyId) penalty += HARD_PENALTY; // Faculty conflict
                if (gene1.classroomId === gene2.classroomId) penalty += HARD_PENALTY; // Classroom conflict
            }
        }
    }

    // Lab constraints
    const labs = chromosome.filter(g => g.isLab);
    const labGroups = Object.groupBy(labs, (l: Gene) => `${l.day}-${l.subjectId}`);
    for (const group of Object.values(labGroups)) {
        if (group!.length !== 2) {
            penalty += HARD_PENALTY; // Must be exactly 2 slots
            continue;
        }
        const timeIndexes = group!.map(g => input.timeSlots.indexOf(g.time)).sort((a,b) => a - b);
        const isConsecutivePair = LAB_SLOT_PAIRS.some(p => p[0] === timeIndexes[0] && p[1] === timeIndexes[1]);
        if (!isConsecutivePair) penalty += HARD_PENALTY; // Must be a valid consecutive pair
    }

    // Soft Constraints
    const facultyWorkload: Record<string, number> = {};
    chromosome.forEach(gene => {
        facultyWorkload[gene.facultyId] = (facultyWorkload[gene.facultyId] || 0) + 1;
    });
    for(const [facultyId, hours] of Object.entries(facultyWorkload)) {
        const facultyMember = input.faculty.find(f => f.id === facultyId);
        if (facultyMember?.maxWeeklyHours && hours > facultyMember.maxWeeklyHours) {
            penalty += SOFT_PENALTY * (hours - facultyMember.maxWeeklyHours);
        }
    }
    
    // Idle gaps
    const daysWithLectures = new Set(chromosome.map(g => g.day));
    daysWithLectures.forEach(day => {
        const daySlots = chromosome.filter(g => g.day === day).map(g => input.timeSlots.indexOf(g.time)).sort((a,b) => a - b);
        if(daySlots.length > 0) {
            const minSlot = daySlots[0];
            const maxSlot = daySlots[daySlots.length - 1];
            const idleGaps = (maxSlot - minSlot + 1) - daySlots.length;
            penalty += idleGaps * SOFT_PENALTY; // Penalize gaps between lectures
        }
    });

    return { fitness: 1 / (1 + penalty), penalty };
}

/**
 * Selects parents for the next generation.
 */
function selection(population: { chromosome: Chromosome, fitness: number }[]): Chromosome {
    // Tournament selection
    const tournamentSize = 3;
    let best = null;
    for (let i = 0; i < tournamentSize; i++) {
        const randomIndividual = population[Math.floor(Math.random() * population.length)];
        if (best === null || randomIndividual.fitness > best.fitness) {
            best = randomIndividual;
        }
    }
    return best!.chromosome;
}


/**
 * Mutates a chromosome.
 */
function mutate(chromosome: Chromosome, input: GenerateTimetableInput): Chromosome {
    let newChromosome = [...chromosome];
    if (Math.random() < MUTATION_RATE) {
        const geneIndex1 = Math.floor(Math.random() * newChromosome.length);
        const geneIndex2 = Math.floor(Math.random() * newChromosome.length);

        const tempDay = newChromosome[geneIndex1].day;
        const tempTime = newChromosome[geneIndex1].time;
        
        newChromosome[geneIndex1].day = newChromosome[geneIndex2].day;
        newChromosome[geneIndex1].time = newChromosome[geneIndex2].time;
        newChromosome[geneIndex2].day = tempDay;
        newChromosome[geneIndex2].time = tempTime;
    }
    return newChromosome;
}

/**
 * The main entry point for the Genetic Algorithm scheduler.
 */
export async function runGA(input: GenerateTimetableInput) {
    if (!input.days || input.days.length === 0 || !input.timeSlots || input.timeSlots.length === 0) {
        return { success: false, message: "Invalid input: Days and time slots must be provided.", bestTimetable: [], error: "Invalid input provided to the engine." };
    }
    
    // --- Setup ---
    const classToSchedule = input.classes[0];
    if (!classToSchedule) return { success: false, message: "No class selected for timetable generation.", bestTimetable: [], error: "No class specified." };
    
    const lectures = createLectureList(input, classToSchedule.id);
    const workingDays = [...input.days];
    const codeChefDay = undefined;

    // --- Pre-Checks ---
    const preCheckError = runPreChecks(input, lectures, workingDays, input.timeSlots);
    if (preCheckError) {
        return { success: false, message: preCheckError, bestTimetable: [], error: preCheckError, codeChefDay };
    }

    // --- GA Execution ---
    let population = createInitialPopulation(input, lectures, workingDays, input.timeSlots);
    let bestSolution: Chromosome | null = null;
    let bestFitness = -1;

    for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
        const fitnessResults = population.map(chromosome => {
            const { fitness } = calculateFitness(chromosome, input);
            return { chromosome, fitness };
        });

        fitnessResults.sort((a, b) => b.fitness - a.fitness);

        if (fitnessResults[0].fitness > bestFitness) {
            bestFitness = fitnessResults[0].fitness;
            bestSolution = fitnessResults[0].chromosome;
        }

        if (bestFitness === 1) { // Perfect solution found
            break;
        }

        const newPopulation: Chromosome[] = [];
        const eliteCount = Math.floor(POPULATION_SIZE * ELITISM_RATE);
        for(let i = 0; i < eliteCount; i++) {
            newPopulation.push(fitnessResults[i].chromosome);
        }

        while (newPopulation.length < POPULATION_SIZE) {
            const parent = selection(fitnessResults);
            const offspring = mutate(parent, input);
            newPopulation.push(offspring);
        }
        population = newPopulation;
    }

    if (bestSolution) {
        const finalSchedule: Schedule[] = bestSolution.map((g, i) => ({
            id: `GEN_${classToSchedule.id}_${i}`, day: g.day as any, time: g.time, classId: g.classId,
            subjectId: g.subjectId, facultyId: g.facultyId, classroomId: g.classroomId,
        }));

        const { penalty } = calculateFitness(bestSolution, input);
        const message = penalty === 0 ? "Successfully generated a conflict-free timetable." : `Generated a partial timetable with some conflicts (penalty: ${penalty}). Please review.`;

        return {
            success: penalty === 0,
            message,
            bestTimetable: finalSchedule,
            codeChefDay
        };
    }

    return {
        success: false,
        message: "Could not generate a valid timetable after all attempts. The constraints may be too restrictive.",
        bestTimetable: [],
        codeChefDay,
        error: "Failed to find a valid solution within the generation limit."
    };
}
