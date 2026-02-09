
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Star, Zap, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getAdminById } from '@/lib/services/admins';
import { upgradeSubscription } from '@/lib/services/subscription';
import type { Admin } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const plans = [
    { name: 'Pro 30', price: 299, credits: 30, tier: 'pro30', features: ['30 Timetable Generations', 'Standard Support'] },
    { name: 'Pro 50', price: 499, credits: 50, tier: 'pro50', features: ['50 Timetable Generations', 'Priority Support'] },
    { name: 'Pro 100', price: 899, credits: 100, tier: 'pro100', features: ['100 Timetable Generations', 'Dedicated Support'] },
];

type Plan = typeof plans[0];

export default function SubscriptionManager() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    const { data: adminDetails, isLoading: adminLoading } = useQuery<Admin | null>({
        queryKey: ['adminDetails', user?.id],
        queryFn: () => getAdminById(user!.id),
        enabled: !!user,
    });
    
    const upgradeMutation = useMutation({
        mutationFn: (tier: 'pro30' | 'pro50' | 'pro100') => upgradeSubscription(user!.id, tier),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['adminDetails', user?.id] });
            toast({
                title: 'Upgrade Successful!',
                description: `Your plan has been upgraded to ${data.tier}. ${data.newCredits} credits have been added.`,
            });
            setPaymentDialogOpen(false);
        },
        onError: (error: any) => {
            toast({ title: 'Upgrade Failed', description: error.message, variant: 'destructive' });
        }
    });
    
    const handleUpgradeClick = (plan: Plan) => {
        setSelectedPlan(plan);
        setPaymentDialogOpen(true);
    };

    const handleConfirmPurchase = () => {
        if (selectedPlan) {
            upgradeMutation.mutate(selectedPlan.tier as any);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Your Current Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    {adminLoading ? (
                        <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : adminDetails ? (
                        <div className="flex items-center justify-between p-6 rounded-lg bg-secondary">
                            <div>
                                <h3 className="text-xl font-bold capitalize flex items-center gap-2">
                                    <Star /> {adminDetails.subscriptionTier || 'Free'} Plan
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{adminDetails.generationCredits}</p>
                                <p className="text-sm text-muted-foreground">Generations Left</p>
                            </div>
                        </div>
                    ) : (
                        <p>Could not load subscription details.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Choose Your Plan</CardTitle>
                    <CardDescription>Upgrade your plan to get more timetable generation credits.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <Card key={plan.name} className={cn("flex flex-col", adminDetails?.subscriptionTier === plan.tier && "border-primary")}>
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>
                                    <span className="text-3xl font-bold">₹{plan.price}</span>
                                    <span className="text-muted-foreground"> / one-time</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                {plan.features.map(feature => (
                                    <div key={feature} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500"/>
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => handleUpgradeClick(plan)}
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Upgrade to {plan.name}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </CardContent>
            </Card>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CreditCard /> Complete Your Purchase</DialogTitle>
                        <DialogDescription>
                             You are about to purchase the <span className="font-semibold text-primary">{selectedPlan?.name}</span> plan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Card className="bg-muted/50 p-6">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Plan: {selectedPlan?.name}</span>
                                <span className="font-bold text-lg">₹{selectedPlan?.price}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                This will add {selectedPlan?.credits} generation credits to your account.
                            </p>
                        </Card>
                        <div className="text-center text-xs text-muted-foreground">
                            This is a simulated payment gateway. No real payment will be processed.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={upgradeMutation.isPending}>Cancel</Button>
                        <Button onClick={handleConfirmPurchase} disabled={upgradeMutation.isPending}>
                            {upgradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Purchase
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
