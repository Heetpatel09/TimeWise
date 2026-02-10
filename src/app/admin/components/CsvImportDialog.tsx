'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, FileCheck2, AlertTriangle, ListChecks } from 'lucide-react';

interface CsvImportDialogProps<T> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requiredHeaders: string[];
  onImport: (data: T[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  dataName: string; // e.g., "Classrooms", "Faculty"
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

export default function CsvImportDialog<T extends Record<string, any>>({
  isOpen,
  onOpenChange,
  requiredHeaders,
  onImport,
  dataName,
}: CsvImportDialogProps<T>) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [parsedData, setParsedData] = useState<T[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);

  const reset = () => {
    setStatus('idle');
    setParsedData([]);
    setFileName('');
    setImportResult(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStatus('parsing');
      setFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            toast({ title: 'Invalid CSV Format', description: `Missing required headers: ${missingHeaders.join(', ')}`, variant: 'destructive' });
            reset();
            return;
          }
          setParsedData(results.data as T[]);
          setStatus('preview');
        },
        error: (error: any) => {
          toast({ title: 'CSV Parsing Error', description: error.message, variant: 'destructive' });
          reset();
        }
      });
    }
  };

  const handleImport = async () => {
    setStatus('importing');
    try {
      const result = await onImport(parsedData);
      setImportResult(result);
      setStatus('complete');
    } catch (error: any) {
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
      reset();
    }
  };
  
  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {dataName} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with the required format to bulk-add {dataName.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div className="py-4 space-y-4">
            <Alert>
                <ListChecks className="h-4 w-4" />
                <AlertTitle>Required CSV Headers</AlertTitle>
                <AlertDescription>
                    <code className="bg-muted text-xs p-1 rounded font-mono">{requiredHeaders.join(', ')}</code>
                </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {status === 'parsing' && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

        {status === 'preview' && (
          <div className="py-4 space-y-4">
            <Alert>
                <FileCheck2 className="h-4 w-4"/>
                <AlertTitle>Preview Data from "{fileName}"</AlertTitle>
                <AlertDescription>
                    Found {parsedData.length} records. Here's a preview of the first few rows.
                </AlertDescription>
            </Alert>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader><TableRow>{requiredHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>{requiredHeaders.map(h => <TableCell key={h} className="text-xs truncate">{row[h]}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {status === 'importing' && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Importing records...</p></div>}
        
        {status === 'complete' && importResult && (
             <div className="py-4 space-y-4">
                <Alert variant={importResult.errorCount > 0 ? 'destructive' : 'default'}>
                    <AlertTitle>Import Complete</AlertTitle>
                    <AlertDescription>
                        <p>{importResult.successCount} records imported successfully.</p>
                        {importResult.errorCount > 0 && <p>{importResult.errorCount} records failed.</p>}
                    </AlertDescription>
                </Alert>
                 {importResult.errorCount > 0 && (
                     <div className="space-y-2">
                        <Label>Import Errors</Label>
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-muted text-xs">
                           {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    </div>
                )}
            </div>
        )}

        <DialogFooter>
          {status === 'idle' && <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>}
          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>Choose Another File</Button>
              <Button onClick={handleImport}>Confirm & Import</Button>
            </>
          )}
          {status === 'complete' && <Button onClick={() => handleClose(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
