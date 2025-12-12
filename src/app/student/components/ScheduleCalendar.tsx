
'use client';

import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Event, EnrichedSchedule, LeaveRequest } from '@/lib/types';
import { holidays } from '@/lib/holidays';
import { Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";

function getDatesInRange(startDate: Date, endDate: Date) {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export function ScheduleCalendar({ 
  schedule, 
  leaveRequests,
  events,
  onDayClick,
}: { 
  schedule: EnrichedSchedule[], 
  leaveRequests: LeaveRequest[],
  events: Event[],
  onDayClick: (date: Date, action: 'reminder' | 'leave' | 'note') => void,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const approvedLeaveDates = useMemo(() => 
    new Set(leaveRequests
        .filter(lr => lr.status === 'approved')
        .flatMap(lr => getDatesInRange(new Date(lr.startDate), new Date(lr.endDate)))
        .map(d => format(d, 'yyyy-MM-dd')))
  , [leaveRequests]);

  const holidayDates = useMemo(() =>
    new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')))
  , []);
  
  const eventDates = useMemo(() => {
    const dateMap = new Map<string, Event[]>();
    events.forEach(e => {
      const dateStr = format(parseISO(e.date), 'yyyy-MM-dd');
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(e);
    });
    return dateMap;
  }, [events]);

  const scheduleDates = useMemo(() => {
    const dateMap = new Map<string, EnrichedSchedule[]>();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    eachDayOfInterval({start: monthStart, end: monthEnd}).forEach(date => {
        const dayName = format(date, 'EEEE');
        const todaysScheduledSlots = schedule.filter(s => s.day === dayName);
        if (todaysScheduledSlots.length > 0) {
            dateMap.set(format(date, 'yyyy-MM-dd'), todaysScheduledSlots);
        }
    });
    return dateMap;
  }, [schedule, currentMonth]);


  const renderDayCell = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isCurrentToday = isToday(day);

    const dayEvents = eventDates.get(dayStr) || [];
    const daySchedule = scheduleDates.get(dayStr) || [];
    const isLeave = approvedLeaveDates.has(dayStr);
    const isHoliday = holidayDates.has(dayStr);
    
    return (
      <Popover key={day.toString()}>
        <PopoverTrigger asChild>
          <div
            className={`relative border-t border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col cursor-pointer transition-colors hover:bg-accent/50 ${
              !isCurrentMonth ? 'bg-muted/30' : 'bg-background'
            }`}
          >
            <div className="flex justify-between items-center">
                <time dateTime={dayStr} className={`text-sm font-medium ${isCurrentToday ? 'bg-primary text-primary-foreground rounded-full flex items-center justify-center h-6 w-6' : ''}`}>
                  {format(day, 'd')}
                </time>
            </div>
            <div className="flex-grow overflow-y-auto text-xs space-y-1 mt-1">
                {isLeave && <Badge variant="destructive" className="w-full justify-center">On Leave</Badge>}
                {isHoliday && <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-800">Holiday</Badge>}
                {daySchedule.map(s => <div key={s.id} className="p-1 rounded bg-primary/10 text-primary truncate">{s.subjectName} - {s.className}</div>)}
                {dayEvents.map(e => <div key={e.id} className="p-1 rounded bg-accent/80 text-accent-foreground truncate">{e.title}</div>)}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
          <div className="grid gap-4">
            <div className="space-y-2">
                <h4 className="font-medium leading-none">{format(day, 'PPP')}</h4>
            </div>
            {(daySchedule.length > 0 || dayEvents.length > 0) ? (
                <div className="grid gap-2">
                    {daySchedule.map(slot => (
                        <div key={slot.id} className="p-2 rounded-md bg-primary/10">
                            <p className="font-semibold text-sm">{slot.subjectName} - {slot.className}</p>
                            <p className="text-xs text-muted-foreground">{slot.time}</p>
                        </div>
                    ))}
                     {dayEvents.map(event => (
                        <div key={event.id} className="p-2 rounded-md bg-accent/80">
                            <p className="font-semibold text-sm">{event.title}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No classes or events scheduled.</p>
            )}
            <div className="grid grid-cols-1 gap-2 mt-2">
                <Button size="sm" onClick={() => onDayClick(day, 'reminder')} variant="outline">
                    <Bell className="h-4 w-4 mr-2"/> Add Reminder
                </Button>
                <Button size="sm" onClick={() => onDayClick(day, 'leave')} variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2"/> Request Leave
                </Button>
                <Button size="sm" onClick={() => onDayClick(day, 'note')} variant="outline">
                    <StickyNote className="h-4 w-4 mr-2"/> Add Note
                </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
     <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                 <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-7 text-center font-semibold text-sm text-muted-foreground border-b border-r border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 border-t">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-grow h-full">
                {daysInMonth.map(renderDayCell)}
            </div>
        </CardContent>
    </Card>
  )
}
