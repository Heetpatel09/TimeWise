
'use client';
import NewSlotRequestsPage from '../components/NewSlotRequestsPage';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewSlotRequests() {
    return (
        <DashboardLayout pageTitle="Admin / New Slot Requests" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <NewSlotRequestsPage />
        </DashboardLayout>
    );
}
