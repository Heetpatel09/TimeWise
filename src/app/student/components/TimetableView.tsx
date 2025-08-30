'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { schedule as allSchedule, subjects, faculty } from '@/lib/placeholder-data';

// Assume logged-in student is Alice Johnson (STU001) in class CLS004
const LOGGED_IN_STUDENT_CLASS_ID = 'CLS004';

export default function TimetableView() {
  const studentSchedule = allSchedule.filter(s => s.classId === LOGGED_IN_STUDENT_CLASS_ID);

  const getRelationName = (id: string, type: 'subject' | 'faculty') => {
    switch (type) {
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'faculty': return faculty.find(f => f.id === id)?.name;
      default: return 'N/A';
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Faculty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentSchedule.length > 0 ? studentSchedule.map((slot) => (
            <TableRow key={slot.id}>
              <TableCell>{slot.day}</TableCell>
              <TableCell>{slot.time}</TableCell>
              <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
              <TableCell>{getRelationName(slot.facultyId, 'faculty')}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
                <TableCell colSpan={4} className="text-center">Your timetable is not yet available.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
