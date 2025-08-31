
'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ScheduleView from "./components/ScheduleView";

export default function FacultyDashboard() {
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const { toast } = useToast();

  const handleLeaveRequestSubmit = () => {
    // Placeholder for API call
    console.log({
      leaveStartDate,
      leaveEndDate,
      leaveReason,
    });

    toast({
      title: 'Leave Request Sent',
      description: 'Your request has been submitted for approval.',
    });

    setLeaveDialogOpen(false);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
  };

  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>My Weekly Schedule</CardTitle>
              <CardDescription>
                Here are your scheduled lectures for the week. You can request changes or apply for leave.
              </CardDescription>
            </div>
            <Button onClick={() => setLeaveDialogOpen(true)}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScheduleView />
        </CardContent>
      </Card>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave of Absence</DialogTitle>
            <DialogDescription>
              Please fill out the form below to submit your leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input 
                  id="start-date" 
                  type="date" 
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input 
                  id="end-date" 
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Leave</Label>
              <Textarea 
                id="reason"
                placeholder="Please provide a brief reason for your absence..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLeaveRequestSubmit}>
              <Send className="mr-2 h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
