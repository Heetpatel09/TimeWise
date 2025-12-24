
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule } from './types';

// This is a simplified, deterministic scheduler based on the reference timetable structure.
// It is not a genetic algorithm anymore, but the file name is kept for consistency with the call site.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CODECHEF_DAY = 'Saturday';

const TIME_SLOTS = [
    '07:30-08:25',
    '08:25-09:20',
    '09:30-10:25',
    '10:25-11:20',
    '12:20-01:15',
    '01:15-02:10'
];

const BREAK_SLOTS_DISPLAY = ['09:20-09:30', '11:20-12:20'];

// --- Helper Functions ---
function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

function findAvailableRoom(type: 'lab' | 'classroom', day: string, time: string, classrooms: Classroom[], schedule: Schedule[]): string | null {
    const availableRooms = classrooms.filter(room => room.type === type);
    for (const room of availableRooms) {
        const isOccupied = schedule.some(slot => 
            slot.day === day && slot.time === time && slot.classroomId === room.id
        );
        if (!isOccupied) {
            return room.id;
        }
    }
    return null;
}

export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty, classrooms, existingSchedule } = input;
    const finalSchedule: Schedule[] = [...(existingSchedule || [])];
    const classId = classesToSchedule[0].id; // We are generating for one class at a time.

    const classSubjects = subjects.filter(s => s.semester === classesToSchedule[0].semester && s.department === classesToSchedule[0].department);
    const theorySubjects = classSubjects.filter(s => s.type === 'theory');
    const labSubjects = classSubjects.filter(s => s.type === 'lab');

    // --- Define the static structure from the reference ---
    const lectureRequirements: Record<string, number> = {
        'PSNM': 4,
        'SE': 4,
        'IP': 3,
        'DAA': 3,
        'OS': 4,
        'CODECHEF': 6,
        'LIBRARY': 2,
    };
    const subjectMap: Record<string, string> = {
        'PSNM': subjects.find(s => s.name.includes("Statistics"))?.id || '',
        'SE': subjects.find(s => s.name.includes("Software Engineering"))?.id || '',
        'IP': subjects.find(s => s.name.includes("Internet Programming"))?.id || '',
        'DAA': subjects.find(s => s.name.includes("Design and Analysis"))?.id || '',
        'OS': subjects.find(s => s.name.includes("Operating Systems"))?.id || '',
        'SE Lab': labSubjects.find(s => s.name.includes("Software Engineering"))?.id || '',
        'DAA Lab': labSubjects.find(s => s.name.includes("Design and Analysis"))?.id || '',
        'OS Lab': labSubjects.find(s => s.name.includes("Operating Systems"))?.id || '',
        'LIBRARY': 'LIB001',
        'CODECHEF': 'CODECHEF',
    }
    
    // --- Template based on reference image ---
    const template: { day: string, time: string, subjectName: string, batch?: 'A' | 'B' }[] = [
        // Monday
        { day: 'Monday', time: '07:30-08:25', subjectName: 'SE' },
        { day: 'Monday', time: '08:25-09:20', subjectName: 'DAA' },
        { day: 'Monday', time: '09:30-10:25', subjectName: 'OS' },
        { day: 'Monday', time: '10:25-11:20', subjectName: 'IP' },
        { day: 'Monday', time: '12:20-01:15', subjectName: 'PSNM' },
        { day: 'Monday', time: '01:15-02:10', subjectName: 'SE' },
        // Tuesday
        { day: 'Tuesday', time: '07:30-08:25', subjectName: 'OS' },
        { day: 'Tuesday', time: '08:25-09:20', subjectName: 'PSNM' },
        { day: 'Tuesday', time: '09:30-10:25', subjectName: 'IP' },
        { day: 'Tuesday', time: '10:25-11:20', subjectName: 'SE' },
        { day: 'Tuesday', time: '12:20-01:15', subjectName: 'DAA' },
        { day: 'Tuesday', time: '01:15-02:10', subjectName: 'PSNM' },
        // Wednesday
        { day: 'Wednesday', time: '07:30-08:25', subjectName: 'DAA' },
        { day: 'Wednesday', time: '08:25-09:20', subjectName: 'OS' },
        { day: 'Wednesday', time: '09:30-10:25', subjectName: 'SE' },
        { day: 'Wednesday', time: '10:25-11:20', subjectName: 'PSNM' },
        { day: 'Wednesday', time: '12:20-01:15', subjectName: 'DAA Lab', batch: 'A' },
        { day: 'Wednesday', time: '12:20-01:15', subjectName: 'OS Lab', batch: 'B' },
        { day: 'Wednesday', time: '01:15-02:10', subjectName: 'DAA Lab', batch: 'A' },
        { day: 'Wednesday', time: '01:15-02:10', subjectName: 'OS Lab', batch: 'B' },
        // Thursday
        { day: 'Thursday', time: '07:30-08:25', subjectName: 'IP' },
        { day: 'Thursday', time: '08:25-09:20', subjectName: 'OS' },
        { day: 'Thursday', time: '09:30-10:25', subjectName: 'LIBRARY' },
        { day: 'Thursday', time: '10:25-11:20', subjectName: 'LIBRARY' },
        // Friday
        { day: 'Friday', time: '07:30-08:25', subjectName: 'SE Lab', batch: 'B' },
        { day: 'Friday', time: '07:30-08:25', subjectName: 'OS Lab', batch: 'A' },
        { day: 'Friday', time: '08:25-09:20', subjectName: 'SE Lab', batch: 'B' },
        { day: 'Friday', time: '08:25-09:20', subjectName: 'OS Lab', batch: 'A' },
    ];
    
    // Add CodeChef Day
    TIME_SLOTS.forEach(time => {
        template.push({ day: CODECHEF_DAY, time, subjectName: 'CODECHEF' });
    });

    const generatedSchedule: Schedule[] = [];

    // --- Fill schedule based on template ---
    for (const slot of template) {
        const subjectId = subjectMap[slot.subjectName];
        if (!subjectId) {
             console.warn(`Could not find subject for name: ${slot.subjectName}`);
             continue;
        }

        let facultyId: string | null;
        let classroomId: string | null;

        if (subjectId === 'LIB001' || subjectId === 'CODECHEF') {
            facultyId = 'NA';
            classroomId = 'NA';
        } else {
            facultyId = getFacultyForSubject(subjectId, faculty);
            if (!facultyId) {
                console.warn(`No faculty for subject ${slot.subjectName}. Skipping slot.`);
                continue;
            }
            
            const roomType = subjectMap[slot.subjectName]?.toLowerCase().includes('lab') ? 'lab' : 'classroom';
            classroomId = findAvailableRoom(roomType, slot.day, slot.time, classrooms, [...finalSchedule, ...generatedSchedule]);
             if (!classroomId) {
                console.warn(`No available ${roomType} for ${slot.subjectName} at ${slot.day} ${slot.time}. Skipping slot.`);
                continue;
            }
        }
        
        generatedSchedule.push({
            id: `GEN${Date.now()}${Math.random()}`,
            day: slot.day,
            time: slot.time,
            classId: classId,
            subjectId: subjectId,
            facultyId: facultyId,
            classroomId: classroomId,
        });
    }

    if (generatedSchedule.length === 0) {
        return {
             success: false,
             message: "Failed to generate any schedule slots. Check subject mapping and faculty assignments.",
             bestTimetable: [],
             generations: 0,
             fitness: -1,
             codeChefDay: CODECHEF_DAY,
        }
    }

    return {
        success: true,
        message: 'Successfully generated schedule from reference template.',
        bestTimetable: generatedSchedule,
        generations: 1,
        fitness: 0,
        codeChefDay: CODECHEF_DAY,
    };
}
