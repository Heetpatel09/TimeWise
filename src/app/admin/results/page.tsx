
'use client';
import ResultsManager from '../components/ResultsManager';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ResultsPage() {
    return (
        <DashboardLayout pageTitle="Admin / Results" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <ResultsManager />
        </DashboardLayout>
    );
}
