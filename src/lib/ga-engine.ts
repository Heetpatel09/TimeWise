
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
            // Labs are handled as 2-hour blocks, so we add ONE lab item to the list.
            // The creation logic will handle placing it in two consecutive slots.
            if (sub.type === 'lab') {
                lectures.push({ classId: cls.id, subjectId: sub.id, isLab: true });
            } else {
                const hours = getHoursForPriority(sub.priority);
                for (let i = 0; i < hours; i++) {
                    lectures.push({
                        classId: cls.id,
                        subjectId: sub.id,
                        isLab: false,
                    });
                }
            }
        });
    });
    return lectures;
}

function createIndividual(lectures: Lecture[], input: GenerateTimetableInput): Chromosome {
    const individual: Chromosome = [];
    const workingDays = [...input.days];
    const lectureSlots = input.timeSlots;
    
    // Designate CodeChef day
    const codeChefDayIndex = Math.floor(Math.random() * workingDays.length);
    const codeChefDay = workingDays.splice(codeChefDayIndex, 1)[0];
    
    // All available slots for placement
    const availableSlots = new Set<string>();
    workingDays.forEach(day => {
        lectureSlots.forEach(time => {
            availableSlots.add(`${day}-${time}`);
        });
    });

    const labs = lectures.filter(l => l.isLab);
    const theories = lectures.filter(l => !l.isLab);

    // 1. Place Labs First (they are harder to place)
    labs.forEach(lab => {
        const facultyId = getFacultyForSubject(lab.subjectId, input.faculty);
        const labRooms = input.classrooms.filter(r => r.type === 'lab');
        if (!facultyId || labRooms.length === 0) return; // Skip if no faculty or room

        const room = labRooms[Math.floor(Math.random() * labRooms.length)];
        let placed = false;

        const shuffledDays = [...workingDays].sort(() => 0.5 - Math.random());
        for (const day of shuffledDays) {
            for (let i = 0; i < lectureSlots.length - 1; i++) {
                const time1 = lectureSlots[i];
                const time2 = lectureSlots[i + 1];
                const slotKey1 = `${day}-${time1}`;
                const slotKey2 = `${day}-${time2}`;

                if (availableSlots.has(slotKey1) && availableSlots.has(slotKey2)) {
                    individual.push({ day, time: time1, ...lab, facultyId, classroomId: room.id });
                    individual.push({ day, time: time2, ...lab, facultyId, classroomId: room.id });
                    availableSlots.delete(slotKey1);
                    availableSlots.delete(slotKey2);
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
    });

    // 2. Place Theory Lectures
    theories.forEach(theory => {
        const facultyId = getFacultyForSubject(theory.subjectId, input.faculty);
        const theoryRooms = input.classrooms.filter(r => r.type === 'classroom');
        if (!facultyId || theoryRooms.length === 0) return;

        const room = theoryRooms[Math.floor(Math.random() * theoryRooms.length)];
        
        if (availableSlots.size > 0) {
            const slotKey = Array.from(availableSlots)[Math.floor(Math.random() * availableSlots.size)];
            const [day, time] = slotKey.split('-');
            individual.push({ day, time, ...theory, facultyId, classroomId: room.id });
            availableSlots.delete(slotKey);
        }
    });

    // 3. Fill remaining slots with Library
    const remainingSlots = Array.from(availableSlots);
    for (let i = 0; i < 3 && i < remainingSlots.length; i++) {
        const slotKey = remainingSlots[i];
        const [day, time] = slotKey.split('-');
        const randomFaculty = input.faculty[Math.floor(Math.random() * input.faculty.length)];
        const randomClassroom = input.classrooms.find(c => c.type === 'classroom') || input.classrooms[0];
        
        individual.push({
            day,
            time,
            classId: input.classes[0].id,
            subjectId: 'LIB001', // Placeholder for Library
            facultyId: randomFaculty.id,
            classroomId: randomClassroom.id,
            isLab: false,
        });
        availableSlots.delete(slotKey);
    }
    
    // 4. Mark CodeChef Day slots
    lectureSlots.forEach(time => {
        individual.push({
            day: codeChefDay,
            time: time,
            classId: input.classes[0].id,
            subjectId: 'CODECHEF',
            facultyId: 'NA',
            classroomId: 'NA',
            isLab: false,
            isCodeChef: true,
        });
    });

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
            if (gene.facultyId !== 'NA' && facultyIds.has(gene.facultyId)) fitness += HARD_CONSTRAINT_PENALTY;
            facultyIds.add(gene.facultyId);
            if (gene.classroomId !== 'NA' && classroomIds.has(gene.classroomId)) fitness += HARD_CONSTRAINT_PENALTY;
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

        // Consecutive lab constraint (re-check, though creation should handle it)
        const labSubjects = input.subjects.filter(s => s.type === 'lab' && s.department === cls.department && s.semester === cls.semester);
        labSubjects.forEach(lab => {
            const labGenes = classSchedule.filter(g => g.subjectId === lab.id);
            if (labGenes.length === 2) {
                const timeIndex1 = input.timeSlots.indexOf(labGenes[0].time);
                const timeIndex2 = input.timeSlots.indexOf(labGenes[1].time);
                if (labGenes[0].day !== labGenes[1].day || Math.abs(timeIndex1 - timeIndex2) !== 1) {
                    fitness += HARD_CONSTRAINT_PENALTY;
                }
            } else if (labGenes.length !== 0) { // If there aren't exactly 2, it's a problem
                 fitness += HARD_CONSTRAINT_PENALTY;
            }
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
             return { success: true, message: 'Optimal solution found.', bestTimetable, generations: generation, fitness: bestFitness, codeChefDay: bestTimetable.find(g => g.isCodeChef)?.day };
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

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness, codeChefDay: bestTimetable?.find(g => g.isCodeChef)?.day };
}
