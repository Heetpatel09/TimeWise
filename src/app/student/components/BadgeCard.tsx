
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BadgeCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

export default function BadgeCard({ icon: Icon, title, description }: BadgeCardProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className="flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-secondary/40 hover:bg-secondary">
                        <div className="p-3 bg-primary/10 rounded-full">
                           <Icon className="w-8 h-8 text-primary" />
                        </div>
                        <p className="mt-2 font-semibold text-sm">{title}</p>
                    </Card>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
