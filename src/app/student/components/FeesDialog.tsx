

'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EnrichedFee } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CheckCircle, Clock, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { payFee } from '@/lib/services/fees';
import { exportFeeReceiptToPDF } from '../actions';
import { useQueryClient } from '@tanstack/react-query';

interface FeesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fees: EnrichedFee[];
  studentId: string;
}

export default function FeesDialog({ isOpen, onOpenChange, fees, studentId }: FeesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const getStatusVariant = (status: EnrichedFee['status']) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': return 'destructive';
      case 'scholarship': return 'secondary';
      default: return 'outline';
    }
  }

  const getStatusIcon = (status: EnrichedFee['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="text-green-500" />;
      case 'unpaid': return <Clock className="text-red-500" />;
      case 'scholarship': return <DollarSign className="text-blue-500" />;
      default: return null;
    }
  }

  const handlePayFee = async (feeId: string) => {
    setIsPaying(feeId);
    try {
      await payFee(feeId, studentId);
      toast({ title: "Payment Successful", description: "Your fee has been marked as paid." });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });
    } catch(error: any) {
      toast({ title: 'Payment Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsPaying(null);
    }
  }

  const handleDownloadReceipt = async (fee: EnrichedFee) => {
    setIsDownloading(fee.id);
    try {
        const { pdf, error } = await exportFeeReceiptToPDF(fee);
        if (error) throw new Error(error);

        const blob = new Blob([new Uint8Array(atob(pdf!).split('').map(char => char.charCodeAt(0)))], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `receipt_${fee.transactionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err: any) {
        toast({ title: 'Download Failed', description: err.message, variant: 'destructive' });
    } finally {
        setIsDownloading(null);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>My Fee History</DialogTitle>
          <DialogDescription>
            A record of all your fee transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
          {fees && fees.length > 0 ? (
            fees.map((fee) => (
                <Card key={fee.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="capitalize">{fee.feeType} Fee</CardTitle>
                                <CardDescription>For Semester {fee.semester}</CardDescription>
                            </div>
                            <Badge variant={getStatusVariant(fee.status)} className="capitalize flex gap-1">
                                {getStatusIcon(fee.status)} {fee.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="font-semibold text-lg">${fee.amount.toFixed(2)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-semibold">{format(parseISO(fee.dueDate), 'PPP')}</p>
                        </div>
                        {fee.status === 'paid' && fee.paymentDate && (
                             <div>
                                <p className="text-sm text-muted-foreground">Paid On</p>
                                <p className="font-semibold">{format(parseISO(fee.paymentDate), 'PPP')}</p>
                            </div>
                        )}
                         {fee.status === 'paid' && fee.transactionId && (
                             <div>
                                <p className="text-sm text-muted-foreground">Transaction ID</p>
                                <p className="font-semibold text-xs">{fee.transactionId}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="justify-end">
                        {fee.status === 'unpaid' && (
                            <Button onClick={() => handlePayFee(fee.id)} disabled={isPaying === fee.id}>
                                {isPaying === fee.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Pay Now
                            </Button>
                        )}
                        {fee.status === 'paid' && (
                            <Button variant="outline" onClick={() => handleDownloadReceipt(fee)} disabled={isDownloading === fee.id}>
                                {isDownloading === fee.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                View Receipt
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No fee records found.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
