
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { testApiKeyFlow as testApiKey } from '@/ai/flows/test-api-key-flow';
import { Loader2, CheckCircle, AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ApiTestPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsLoading(true);
        setIsSuccess(null);
        try {
            const result = await testApiKey();
            if (result.success) {
                setIsSuccess(true);
                toast({
                    title: <div className="flex items-center gap-2"><CheckCircle /> API Key is Working!</div>,
                    description: 'Successfully connected to the Gemini API.',
                });
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error: any) {
            setIsSuccess(false);
            toast({
                variant: 'destructive',
                title: <div className="flex items-center gap-2"><AlertTriangle /> API Key Test Failed</div>,
                description: error.message || 'Could not connect to the Gemini API. Please check your key and environment variables.',
            });
        } finally {
            setIsLoading(false);
        }
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
