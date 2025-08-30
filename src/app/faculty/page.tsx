import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ScheduleView from "./components/ScheduleView";

export default function FacultyDashboard() {
  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <Card>
        <CardHeader>
          <CardTitle>My Weekly Schedule</CardTitle>
          <CardDescription>
            Here are your scheduled lectures for the week. You can request changes if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleView />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
