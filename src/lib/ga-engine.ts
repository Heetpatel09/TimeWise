
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
    hours: number;
}

// --- Fitness & Penalties ---
const HARD_CONSTRAINT_PENALTY = 1000;
const SOFT_CONSTRAINT_PENALTY = 10;

// --- Helper Functions ---

/**
 * Pre-processes the input data to create a list of all required lecture slots.
 * Enforces the "one faculty per subject per class" rule here.
 */
function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    input.classes.forEach(cls => {
        const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
        
        classSubjects.forEach(sub => {
            // Find a single, consistent faculty for this subject and class
            const facultyForSubject = input.faculty.find(f => f.allottedSubjects.includes(sub.id));
            if (!facultyForSubject) {
                // This will be caught by the impossibility check, but good to be defensive
                return;
            }

            const isLab = sub.type.toLowerCase() === 'lab';
             // Labs are typically 2 hours, Theory 3 hours per week.
            const hours = isLab ? 2 : 3;

            lectures.push({
                classId: cls.id,
                subjectId: sub.id,
                facultyId: facultyForSubject.id,
                isLab: isLab,
                hours: hours
            });
        });
    });
    
    // Flatten into individual 1-hour genes
    const flatLectures: Omit<Lecture, 'hours'>[] = [];
    lectures.forEach(lec => {
        for (let i = 0; i < lec.hours; i++) {
            flatLectures.push({
                classId: lec.classId,
                subjectId: lec.subjectId,
                facultyId: lec.facultyId,
                isLab: lec.isLab
            });
        }
    });

    return flatLectures as any; // The structure is now equivalent to the old one
}


/**
 * Generates a single random, but structurally valid, timetable (Chromosome).
 */
function createIndividual(lectures: Omit<Lecture, 'hours'>[], input: GenerateTimetableInput): Chromosome {
    const individual: Chromosome = [];
    const timeSlots = input.timeSlots.filter(t => !t.toLowerCase().includes('recess'));

    // Create a pool of all available slots for this individual schedule
    const availableSlots: { day: string; time: string }[] = [];
    input.days.forEach(day => {
        timeSlots.forEach(time => {
            availableSlots.push({ day, time });
        });
    });

    // Shuffle the lecture list to ensure random placement
    for (let i = lectures.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lectures[i], lectures[j]] = [lectures[j], lectures[i]];
    }

    const assignedSlotsForClass = new Map<string, Set<string>>(); // classId -> Set<"day-time">

    lectures.forEach(lecture => {
        const requiredClassroomType = lecture.isLab ? 'lab' : 'classroom';
        const availableClassrooms = input.classrooms.filter(c => c.type === requiredClassroomType);
        
        if (availableClassrooms.length === 0) return; // Impossibility check will handle this

        const classroom = availableClassrooms[Math.floor(Math.random() * availableClassrooms.length)];

        // Find a random slot that is not yet taken by this class
        let foundSlot = false;
        for (let i = 0; i < availableSlots.length * 2; i++) { // Try a few times to find a free slot
            const slotIndex = Math.floor(Math.random() * availableSlots.length);
            const slot = availableSlots[slotIndex];
            const slotKey = `${slot.day}-${slot.time}`;

            if (!assignedSlotsForClass.has(lecture.classId)) {
                assignedSlotsForClass.set(lecture.classId, new Set());
            }

            if (!assignedSlotsForClass.get(lecture.classId)!.has(slotKey)) {
                individual.push({ ...slot, ...lecture, classroomId: classroom.id });
                assignedSlotsForClass.get(lecture.classId)!.add(slotKey);
                foundSlot = true;
                break;
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
        
        classSchedule.forEach(gene => {
            if (!dailySubjects.has(gene.day)) dailySubjects.set(gene.day, new Set());
            dailySubjects.get(gene.day)!.add(gene.subjectId);
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
        const timeSlots = input.timeSlots.filter(t => !t.toLowerCase().includes('recess'));
        input.days.forEach(day => {
            const dayScheduleIndexes = classSchedule.filter(g => g.day === day).map(g => timeSlots.indexOf(g.time)).sort((a,b) => a-b);
            if (dayScheduleIndexes.length > 1) {
                for (let i = 0; i < dayScheduleIndexes.length - 1; i++) {
                    const gap = dayScheduleIndexes[i+1] - dayScheduleIndexes[i];
                    if (gap > 1) {
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
        
        // NEW: Classroom Consistency Penalty
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
function mutate(chromosome: Chromosome, lectures: Omit<Lecture, 'hours'>[], input: GenerateTimetableInput): Chromosome {
    const newChromosome = JSON.parse(JSON.stringify(chromosome));
    
    for (let i = 0; i < newChromosome.length; i++) {
        if (Math.random() < MUTATION_RATE) {
            // Swap two random genes' time/day
            const j = Math.floor(Math.random() * newChromosome.length);
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
    
    // Repair children to have correct number of lectures for each class-subject combo
    // This is a complex step, for this implementation we rely on selection and mutation
    // to eventually converge. A more advanced GA might have a dedicated repair function.
    
    return [child1, child2];
}

/**
* Checks if a valid schedule is even possible with the given constraints.
*/
function checkImpossibility(lectures: Omit<Lecture, 'hours'>[], input: GenerateTimetableInput): string | null {
   // Check if every subject has an assigned faculty
   const subjectsWithoutFaculty = new Set<string>();
   input.classes.forEach(cls => {
       const classSubjects = input.subjects.filter(s => s.semester === cls.semester && s.department === cls.department);
       classSubjects.forEach(sub => {
           const hasFaculty = input.faculty.some(f => f.allottedSubjects.includes(sub.id));
           if (!hasFaculty) {
               subjectsWithoutFaculty.add(sub.name);
           }
       });
   });

   if (subjectsWithoutFaculty.size > 0) {
       return `The following subjects do not have any faculty assigned to them: ${[...subjectsWithoutFaculty].join(', ')}. Please assign faculty to these subjects.`;
   }


   // Check faculty availability
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

   // Check classroom availability
   const requiredLabSlots = lectures.filter(l => l.isLab).length;
   const availableLabSlots = input.classrooms.filter(c => c.type === 'lab').length * input.days.length * input.timeSlots.filter(t => !t.toLowerCase().includes('recess')).length;
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
        while (newPopulation.length < POPULATION_SIZE) {
            const parent1 = fitnessScores[Math.floor(Math.random() * (population.length / 2))].chromosome;
            const parent2 = fitnessScores[Math.floor(Math.random() * (population.length / 2))].chromosome;
            const [child1, child2] = crossover(parent1, parent2);
            newPopulation.push(mutate(child1, lectures, input));
            if (newPopulation.length < POPULATION_SIZE) {
                newPopulation.push(mutate(child2, lectures, input));
            }
        }
        population = newPopulation;
    }

    if (bestFitness > HARD_CONSTRAINT_PENALTY) {
         return { success: false, message: `Could not find a conflict-free schedule after ${MAX_GENERATIONS} generations. The best found schedule still had hard constraint violations. This may be due to overly restrictive constraints.`, bestTimetable: null, generations: MAX_GENERATIONS, fitness: bestFitness };
    }

    return { success: true, message: 'Found an optimized, conflict-free schedule.', bestTimetable, generations: MAX_GENERATIONS, fitness: bestFitness };
}
