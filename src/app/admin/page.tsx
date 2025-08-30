import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users } from "lucide-react";
import SubjectsManager from "./components/SubjectsManager";
import ClassesManager from "./components/ClassesManager";
import FacultyManager from "./components/FacultyManager";
import StudentsManager from "./components/StudentsManager";
import ScheduleManager from "./components/ScheduleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {

  const tabs = [
    { value: "subjects", label: "Subjects", icon: Book, component: <SubjectsManager /> },
    { value: "classes", label: "Classes", icon: School, component: <ClassesManager /> },
    { value: "faculty", label: "Faculty", icon: UserCheck, component: <FacultyManager /> },
    { value: "students", label: "Students", icon: Users, component: <StudentsManager /> },
    { value: "schedule", label: "Schedule", icon: Calendar, component: <ScheduleManager /> },
  ];

  return (
    <DashboardLayout pageTitle="Admin Dashboard" role="admin">
      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label} Management</CardTitle>
                <CardDescription>
                  Add, edit, or delete {tab.label.toLowerCase()} from the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tab.component}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
