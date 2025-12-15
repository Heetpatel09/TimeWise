'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { testApiKeyFlow as testApiKey } from '@/ai/flows/test-api-key-flow';
import { Loader2, CheckCircle, AlertTriangle, KeyRound, ArrowLeft, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ApiTestPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, error?: string } | null>(null);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsLoading(true);
        setTestResult(null);
        try {
            const result = await testApiKey();
            setTestResult(result);
            if (result.success) {
                toast({
                    title: <div className="flex items-center gap-2"><CheckCircle /> API Key is Working!</div>,
                    description: 'Successfully connected to the Gemini API.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: <div className="flex items-center gap-2"><AlertTriangle /> API Key Test Failed</div>,
                    description: result.error || 'Could not connect to the Gemini API.',
                });
            }
        } catch (error: any) {
            const result = { success: false, error: error.message || 'An unknown error occurred.'};
            setTestResult(result);
            toast({
                variant: 'destructive',
                title: <div className="flex items-center gap-2"><AlertTriangle /> API Key Test Failed</div>,
                description: result.error,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <DashboardLayout pageTitle="Admin / Gemini API Key Test" role="admin">
             <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> Test Gemini API Key</CardTitle>
                    <CardDescription>
                        This tool helps diagnose connection issues with the Google AI services.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Action Required to Fix AI Features</AlertTitle>
                        <AlertDescription>
                            The "404 Not Found" error indicates the **Vertex AI API** is likely not enabled for your Google Cloud project. Please click the button below to go to the Google Cloud Console and enable it.
                        </AlertDescription>
                         <div className="mt-4">
                             <a href="https://console.cloud.google.com/apis/library/vertexai.googleapis.com" target="_blank" rel="noopener noreferrer">
                                <Button>
                                    <ExternalLink className="mr-2 h-4 w-4" /> Enable Vertex AI API
                                </Button>
                            </a>
                        </div>
                    </Alert>

                     <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Connection Test</CardTitle>
                             <CardDescription>
                                After enabling the API, click the button below to verify the connection.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center">
                                 <Button onClick={handleTest} disabled={isLoading} size="lg">
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <KeyRound className="mr-2 h-4 w-4" />
                                    )}
                                    Test API Connection
                                </Button>
                            </div>
                            {testResult && (
                                <div className="mt-4 rounded-md border p-4">
                                    <h4 className="font-semibold mb-2">Test Result:</h4>
                                    {testResult.success ? (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle />
                                            <p>Success! The connection to Google AI is working correctly.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 text-destructive">
                                            <div className='flex items-center gap-2'>
                                                <AlertTriangle />
                                                <p>Failed. The API returned an error.</p>
                                            </div>
                                            <p className="font-mono bg-destructive/10 p-2 rounded-md text-xs">{testResult.error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
