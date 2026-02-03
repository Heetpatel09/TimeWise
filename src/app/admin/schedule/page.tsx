
'use client';
import ScheduleManager from '../components/ScheduleManager';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SchedulePage() {
    return (
        <DashboardLayout pageTitle="Admin / Master Schedule" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <ScheduleManager />
        </DashboardLayout>
    );
}
