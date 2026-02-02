
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Faculty, Subject } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

function setsAreEqual<T>(a: Set<T>, b: Set<T>) {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

export async function saveTeacherAllocation(
    allocation: { [subjectName: string]: { [teacherName: string]: string[] } },
    allSubjects: Subject[],
    allFaculty: Faculty[]
) {
    const db = getDb();

    const subjectMap = new Map(allSubjects.map(s => [s.name, s.id]));
    const facultyMap = new Map(allFaculty.map(f => [f.name, f.id]));

    // Prepare a map to hold the final state of allotted subjects for each teacher
    const facultySubjectUpdates = new Map<string, Set<string>>();

    // Initialize with existing allotments for all faculty
    allFaculty.forEach(fac => {
        facultySubjectUpdates.set(fac.id, new Set(fac.allottedSubjects || []));
    });

    for (const subjectName in allocation) {
        const teacherAllocations = allocation[subjectName];
        for (const teacherName in teacherAllocations) {
            if (teacherName === 'No Teacher Assigned') continue;

            const subjectId = subjectMap.get(subjectName);
            if (!subjectId) {
                console.warn(`Subject "${subjectName}" not found during save. Skipping.`);
                continue;
            }

            const facultyId = facultyMap.get(teacherName);
            if (!facultyId) {
                console.warn(`Faculty "${teacherName}" not found during save. Skipping.`);
                continue;
            }
            
            const subjectSet = facultySubjectUpdates.get(facultyId);
            if (subjectSet) {
                subjectSet.add(subjectId);
            } else {
                 console.warn(`Faculty ID "${facultyId}" not found in initial map. This should not happen.`);
            }
        }
    }

    // Now, update the database
    db.transaction(() => {
        const stmt = db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?');
        for (const [facultyId, subjectSet] of facultySubjectUpdates.entries()) {
            const originalSubjects = new Set(allFaculty.find(f => f.id === facultyId)?.allottedSubjects || []);
            // Only update if there's a change
            if (!setsAreEqual(originalSubjects, subjectSet)) {
                const newAllotmentJson = JSON.stringify(Array.from(subjectSet));
                stmt.run(newAllotmentJson, facultyId);
            }
        }
    })();

    revalidateAll();
    return Promise.resolve({ success: true });
}
