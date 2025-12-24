
'use server';

import type { GenerateTimetableInput, SubjectPriority, Class, Subject, Faculty, Classroom, Schedule } from './types';

// --- Core GA Configuration ---
const POPULATION_SIZE = 50;
const MAX_GENERATIONS = 100;
const ELITISM_RATE = 0.1;
const MUTATION_RATE = 0.15;

// --- Fitness & Penalties ---
const HARD_CONSTRAINT_PENALTY = 1000;
const SOFT_CONSTRAINT_PENALTY = 10;
const CLASSROOM_CHANGE_PENALTY = 25;
const IDLE_SLOT_PENALTY = 5;
const CONSECUTIVE_THEORY_PENALTY = 20;


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
}

type Chromosome = Gene[];

interface Lecture {
    classId: string;
    subjectId: string;
    isLab: boolean;
}

// --- Helper Functions ---
const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3;
    }
};

function getFacultyForSubject(subjectId: string, faculty: Faculty[]): string | null {
    const assignedFaculty = faculty.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

function checkFacultyWorkload(chromosome: Chromosome, faculty: Faculty[]): boolean {
    const facultyHours = new Map<string, number>();
    chromosome.forEach(gene => {
        if (!gene.isCodeChef) {
            facultyHours.set(gene.facultyId, (facultyHours.get(gene.facultyId) || 0) + 1);
        }
    });

    for (const fac of faculty) {
        if ((facultyHours.get(fac.id) || 0) > (fac.maxWeeklyHours || 18)) {
            return false;
        }
    }
    return true;
}

// --- Main GA Implementation ---

function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    input.classes.forEach(cls => {
        const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
        classSubjects.forEach(sub => {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: cls.id,
                    subjectId: sub.id,
                    isLab: sub.type === 'lab',
                });
            }
        });
    });
    return lectures;
}

function createIndividual(lectures: Lecture[], input: GenerateTimetableInput): Chromosome {
    const individual: Chromosome = [];
    const workingDays = input.days;
    const lectureSlots = input.timeSlots.filter(t => !t.includes('9:30-10:00') && !t.includes('12:00-01:00'));

    // Create a pool of available slots for each class
    const availableSlots: { [classId: string]: { day: string; time: string }[] } = {};
    input.classes.forEach(cls => {
        availableSlots[cls.id] = [];
        workingDays.forEach(day => {
            lectureSlots.forEach(time => {
                availableSlots[cls.id].push({ day, time });
            });
        });
        // Shuffle slots
        availableSlots[cls.id].sort(() => Math.random() - 0.5);
    });

    const tempLectures = [...lectures];
    // Place labs first (they require 2 consecutive slots)
    const labLectures = tempLectures.filter(l => l.isLab);
    const theoryLectures = tempLectures.filter(l => !l.isLab);

    const placeLecture = (lec: Lecture, isLabBlock = false) => {
        const classSlots = availableSlots[lec.classId];
        if (!classSlots || classSlots.length < (isLabBlock ? 2 : 1)) return false;

        const facultyId = getFacultyForSubject(lec.subjectId, input.faculty);
        if (!facultyId) return false;

        const roomType = lec.isLab ? 'lab' : 'classroom';
        const possibleRooms = input.classrooms.filter(r => r.type === roomType);
        if (possibleRooms.length === 0) return false;

        if (isLabBlock) {
             for (let i = 0; i < classSlots.length - 1; i++) {
                const slot1 = classSlots[i];
                const slot2 = classSlots[i+1];
                const timeIndex1 = lectureSlots.indexOf(slot1.time);
                const timeIndex2 = lectureSlots.indexOf(slot2.time);

                if (slot1.day === slot2.day && timeIndex2 === timeIndex1 + 1) {
                    const room = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];
                    individual.push({ ...slot1, ...lec, facultyId, classroomId: room.id });
                    individual.push({ ...slot2, ...lec, facultyId, classroomId: room.id });
                    classSlots.splice(i, 2); // Remove used slots
                    return true;
                }
            }
            return false; // Could not find consecutive slots
        } else {
            const slot = classSlots.pop()!;
            const room = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];
            individual.push({ ...slot, ...lec, facultyId, classroomId: room.id });
            return true;
        }
    };
    
    // Group labs by subject and class
    const labGroups = new Map<string, Lecture[]>();
    labLectures.forEach(lec => {
        const key = `${lec.classId}-${lec.subjectId}`;
        if (!labGroups.has(key)) labGroups.set(key, []);
        labGroups.get(key)!.push(lec);
    });

    // Place lab blocks (2 hours)
    for (const labGroup of labGroups.values()) {
        for (let i = 0; i < labGroup.length; i += 2) {
             if (labGroup[i]) placeLecture(labGroup[i], true);
        }
    }
    
    // Place theory lectures
    theoryLectures.forEach(lec => placeLecture(lec));

    // Designate CodeChef day
    const codeChefDay = workingDays[Math.floor(Math.random() * workingDays.length)];
    const codeChefGenes = individual.filter(g => g.day === codeChefDay);
    codeChefGenes.forEach(g => g.isCodeChef = true);


    return individual;
}

function calculateFitness(chromosome: Chromosome, input: GenerateTimetableInput): number {
    let fitness = 0;
    const timeSlotMap = new Map<string, Gene[]>();

    chromosome.forEach(gene => {
        if (gene.isCodeChef) return;
        const key = `${gene.day}-${gene.time}`;
        if (!timeSlotMap.has(key)) timeSlotMap.set(key, []);
        timeSlotMap.get(key)!.push(gene);
    });

    // Hard Constraints
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

    if (!checkFacultyWorkload(chromosome, input.faculty)) {
        fitness += HARD_CONSTRAINT_PENALTY * 10;
    }
    
    // Soft Constraints
    input.classes.forEach(cls => {
        const classSchedule = chromosome.filter(g => g.classId === cls.id && !g.isCodeChef);
        const dayScheduleMap = new Map<string, Gene[]>();
        classSchedule.forEach(gene => {
            if (!dayScheduleMap.has(gene.day)) dayScheduleMap.set(gene.day, []);
            dayScheduleMap.get(gene.day)!.push(gene);
        });

        dayScheduleMap.forEach(lecturesOnDay => {
            const sortedLectures = lecturesOnDay.sort((a, b) => input.timeSlots.indexOf(a.time) - input.timeSlots.indexOf(b.time));
            let consecutiveTheory = 0;
            for (let i = 0; i < sortedLectures.length; i++) {
                if (!sortedLectures[i].isLab) {
                    consecutiveTheory++;
                } else {
                    consecutiveTheory = 0;
                }
                if (consecutiveTheory > 2) {
                    fitness += CONSECUTIVE_THEORY_PENALTY;
                }

                if (i > 0) {
                     const timeIndexCurrent = input.timeSlots.indexOf(sortedLectures[i].time);
                     const timeIndexPrev = input.timeSlots.indexOf(sortedLectures[i-1].time);
                     if (timeIndexCurrent - timeIndexPrev > 1) {
                         fitness += IDLE_SLOT_PENALTY;
                     }
                     if (timeIndexCurrent - timeIndexPrev === 1 && !sortedLectures[i].isLab && !sortedLectures[i-1].isLab && sortedLectures[i].classroomId !== sortedLectures[i-1].classroomId) {
                         fitness += CLASSROOM_CHANGE_PENALTY;
                     }
                }
            }
        });
    });
    
    return fitness;
}

function crossover(parent1: Chromosome, parent2: Chromosome): Chromosome[] {
    const point = Math.floor(Math.random() * parent1.length);
    const child1 = [...parent1.slice(0, point), ...parent2.slice(point)];
    const child2 = [...parent2.slice(0, point), ...parent1.slice(point)];
    return [child1, child2];
}

function mutate(chromosome: Chromosome, input: GenerateTimetableInput): Chromosome {
    if (Math.random() > MUTATION_RATE) return chromosome;

    const geneIndex1 = Math.floor(Math.random() * chromosome.length);
    const geneIndex2 = Math.floor(Math.random() * chromosome.length);
    
    if (chromosome[geneIndex1].isCodeChef || chromosome[geneIndex2].isCodeChef) return chromosome;
    
    // Swap times and days, keep everything else the same to maintain subject/faculty/class constraints
    const tempDay = chromosome[geneIndex1].day;
    const tempTime = chromosome[geneIndex1].time;
    chromosome[geneIndex1].day = chromosome[geneIndex2].day;
    chromosome[geneIndex1].time = chromosome[geneIndex2].time;
    chromosome[geneIndex2].day = tempDay;
    chromosome[geneIndex2].time = tempTime;

    return chromosome;
}

export async function runGA(input: GenerateTimetableInput) {
    const lectures = createLectureList(input);
    const lectureSlots = input.timeSlots.filter(t => !t.includes('9:30-10:00') && !t.includes('12:00-01:00'));

    let population = Array.from({ length: POPULATION_SIZE }, () => createIndividual(lectures, input));

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
            newPopulation.push(mutate(child1, input));
            if (newPopulation.length < POPULATION_SIZE) {
                newPopulation.push(mutate(child2, input));
            }
        }
        population = newPopulation;
    }

    if (bestFitness >= HARD_CONSTRAINT_PENALTY) {
         return { success: false, message: `Could not find a conflict-free schedule after ${MAX_GENERATIONS} generations. The best found schedule still had hard constraint violations. This may be due to overly restrictive constraints (e.g., not enough faculty or classrooms).`, bestTimetable: null, generations: MAX_GENERATIONS, fitness: bestFitness };
    }

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness };
}
