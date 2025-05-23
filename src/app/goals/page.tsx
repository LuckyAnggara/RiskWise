
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Mock data for initial state - in a real app, this would come from a store or API
const INITIAL_GOALS: Goal[] = [
  { id: 'g1', name: 'Launch New Product X', description: 'Successfully develop and launch Product X by Q4 2024 to capture 5% market share within the first year.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', name: 'Improve Customer Satisfaction', description: 'Increase overall customer satisfaction (CSAT) score from 80% to 90% by end of 2024 through improved support and product usability.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', name: 'Expand to European Market', description: 'Establish a market presence in at least 3 key European countries by mid-2025, achieving initial sales targets.', createdAt: '2024-01-20T09:15:00Z' },
];


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data
    const storedGoals = localStorage.getItem('riskwise-goals');
    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    } else {
      setGoals(INITIAL_GOALS);
      localStorage.setItem('riskwise-goals', JSON.stringify(INITIAL_GOALS));
    }
  }, []);

  const updateLocalStorage = (updatedGoals: Goal[]) => {
    localStorage.setItem('riskwise-goals', JSON.stringify(updatedGoals));
  };

  const handleGoalSave = (goal: Goal) => {
    setGoals(prevGoals => {
      const existingIndex = prevGoals.findIndex(g => g.id === goal.id);
      let updatedGoals;
      if (existingIndex > -1) {
        updatedGoals = [...prevGoals];
        updatedGoals[existingIndex] = goal;
        toast({ title: "Goal Updated", description: `Goal "${goal.name}" has been successfully updated.` });
      } else {
        updatedGoals = [goal, ...prevGoals];
        toast({ title: "Goal Added", description: `New goal "${goal.name}" has been successfully added.` });
      }
      updateLocalStorage(updatedGoals);
      return updatedGoals;
    });
  };

  const handleGoalDelete = (goalId: string) => {
    setGoals(prevGoals => {
      const goalToDelete = prevGoals.find(g => g.id === goalId);
      const updatedGoals = prevGoals.filter(g => g.id !== goalId);
      updateLocalStorage(updatedGoals);
      if (goalToDelete) {
        toast({ title: "Goal Deleted", description: `Goal "${goalToDelete.name}" has been deleted.`, variant: "destructive" });
      }
      // Also delete associated risks and controls from localStorage if they exist
      const storedRisks = localStorage.getItem(`riskwise-risks-${goalId}`);
      if (storedRisks) {
        localStorage.removeItem(`riskwise-risks-${goalId}`);
        const risks: Array<{id: string}> = JSON.parse(storedRisks);
        risks.forEach(risk => {
          localStorage.removeItem(`riskwise-controls-${risk.id}`);
        });
      }
      return updatedGoals;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Define and manage your strategic objectives."
        actions={
          <AddGoalDialog onGoalSave={handleGoalSave} 
            triggerButton={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
              </Button>
            }
          />
        }
      />

      {goals.length === 0 ? (
        <div className="text-center py-10">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No goals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first goal.
          </p>
          <div className="mt-6">
            <AddGoalDialog onGoalSave={handleGoalSave} 
              triggerButton={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onEditGoal={handleGoalSave} 
              onDeleteGoal={handleGoalDelete}
              // riskCount can be fetched or calculated if risks are managed globally
            />
          ))}
        </div>
      )}
    </div>
  );
}
