
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import type { EnrichedSchedule } from '@/lib/types';
import AttendanceDialog from './AttendanceDialog';

export default function DailySchedule({ schedule }: { schedule: EnrichedSchedule[] }) {
  const [isAttendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<EnrichedSchedule | null>(null);

  const todaysSchedule = useMemo(() => {
    if (!schedule) return [];
    const todayName = format(new Date(), 'EEEE');
    return schedule.filter(s => s.day === todayName);
  }, [schedule]);

  const handleTakeAttendance = (slot: EnrichedSchedule) => {
    setSelectedSlot(slot);
    setAttendanceDialogOpen(true);
  };
  
  const now = new Date();
  const lockTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0); // 7:00 PM today
  const isLocked = now > lockTime;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule & Attendance</CardTitle>
        <CardDescription>{format(new Date(), 'PPP')}</CardDescription>
      </CardHeader>
      <CardContent>
        {todaysSchedule.length > 0 ? (
          <div className="space-y-3">
            {todaysSchedule.map(slot => (
              <div key={slot.id} className="flex justify-between items-center p-3 rounded-md bg-muted">
                <div>
                  <p className="font-semibold text-sm">{slot.subjectName}</p>
                  <p className="text-xs text-muted-foreground">{slot.time} - {slot.className}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleTakeAttendance(slot)}
                  disabled={isLocked}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {isLocked ? 'Locked' : 'Attendance'}
                </Button>
              </div>
            ))}
            {isLocked && <p className="text-xs text-center text-muted-foreground mt-2">Attendance is locked after 7 PM.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled for today.</p>
        )}
      </CardContent>
      {isAttendanceDialogOpen && selectedSlot && (
        <AttendanceDialog
          slot={selectedSlot}
          date={new Date()}
          isOpen={isAttendanceDialogOpen}
          onOpenChange={setAttendanceDialogOpen}
        />
      )}
    </Card>
  );
}
