
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
// import { testApiKey } from '@/ai/flows/test-api-key-flow';
import { Loader2, CheckCircle, AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ApiTestPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsLoading(true);
        toast({
            variant: 'destructive',
            title: <div className="flex items-center gap-2"><AlertTriangle /> AI Feature Disabled</div>,
            description: 'AI features are currently disabled due to installation issues.',
        });
        setIsLoading(false);
        // try {
        //     const result = await testApiKey();
        //     toast({
        //         title: <div className="flex items-center gap-2"><CheckCircle className="text-green-500" /> Success!</div>,
        //         description: result.message,
        //     });
        // } catch (error: any) {
        //     toast({
        //         variant: 'destructive',
        //         title: <div className="flex items-center gap-2"><AlertTriangle /> API Key Test Failed</div>,
        //         description: error.message || 'An unknown error occurred.',
        //     });
        // } finally {
        //     setIsLoading(false);
        // }
    }

    return (
        <DashboardLayout pageTitle="Admin / API Key Test" role="admin">
             <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> Test Gemini API Key</CardTitle>
                    <CardDescription>
                        Click the button below to verify that your Gemini API key is configured correctly and working.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mt-6 flex justify-center">
                         <Button onClick={handleTest} disabled={isLoading} size="lg">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <KeyRound className="mr-2 h-4 w-4" />
                            )}
                            Test API Key
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
