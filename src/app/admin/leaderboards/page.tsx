
'use client';
import LeaderboardManager from '../components/LeaderboardManager';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LeaderboardsPage() {
    return (
        <DashboardLayout pageTitle="Admin / Leaderboards" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <LeaderboardManager />
        </DashboardLayout>
    );
}
