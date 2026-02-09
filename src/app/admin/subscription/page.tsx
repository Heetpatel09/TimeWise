
'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SubscriptionManager from '../components/SubscriptionManager';

export default function SubscriptionPage() {
    return (
        <DashboardLayout pageTitle="Admin / Billing & Subscription" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <SubscriptionManager />
        </DashboardLayout>
    );
}
