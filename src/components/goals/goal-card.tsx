
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ShieldAlert, Edit, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/types';
import { AddGoalDialog } from './add-goal-dialog';

interface GoalCardProps {
  goal: Goal;
  // onEditGoal sekarang akan memanggil action dari store, jadi kita tidak perlu passing currentUprId/Period lagi ke AddGoalDialog dari sini
  onEditGoal: (goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'userId' | 'period'>, existingGoalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export function GoalCard({ goal, onEditGoal, onDeleteGoal }: GoalCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Target className="h-8 w-8 text-primary mb-2" />
          <div className="flex space-x-2">
             <AddGoalDialog 
                existingGoal={goal} 
                onGoalSave={(data) => onEditGoal(data, goal.id)}
                currentUprId={goal.userId} // Diambil dari goal.userId yang seharusnya merupakan UPR ID
                currentPeriod={goal.period}
                triggerButton={
                  <Button variant="ghost" size="icon" aria-label={`Edit sasaran ${goal.name} (${goal.code})`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                }
              />
            <Button variant="ghost" size="icon" aria-label={`Hapus sasaran ${goal.name} (${goal.code})`} onClick={() => onDeleteGoal(goal.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg">{goal.code} - {goal.name}</CardTitle> 
        <CardDescription className="line-clamp-3 min-h-[3.75rem] text-sm">{goal.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground">
          Dibuat: {new Date(goal.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end items-center">
        <Link href={`/risks/${goal.id}`} passHref>
          <Button variant="outline" size="sm">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Lihat Potensi Risiko
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
