'use client';

import DashboardLayout from "@/components/DashboardLayout";
import TimetableView from './components/TimetableView';

export default function FacultyDashboard() {
  
  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <TimetableView />
    </DashboardLayout>
  );
}
