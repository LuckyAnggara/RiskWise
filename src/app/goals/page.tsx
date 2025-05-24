
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal } from '@/lib/types';
import { PlusCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Simulated current UPR and Period context
const CURRENT_UPR_ID = 'UPR001';
const CURRENT_PERIOD = '2024';

// Initial data if localStorage is empty, will be tagged with current UPR/Period
const INITIAL_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', name: 'Launch New Product X', description: 'Successfully develop and launch Product X by Q4 2024 to capture 5% market share within the first year.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', name: 'Improve Customer Satisfaction', description: 'Increase overall customer satisfaction (CSAT) score from 80% to 90% by end of 2024 through improved support and product usability.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', name: 'Expand to European Market', description: 'Establish a market presence in at least 3 key European countries by mid-2025, achieving initial sales targets.', createdAt: '2024-01-20T09:15:00Z' },
];

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-risks`;
const getControlsStorageKey = (uprId: string, period: string, riskId: string) => `riskwise-upr${uprId}-period${period}-risk${riskId}-controls`;


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let storedGoalsData = null;
    if (typeof window !== 'undefined') {
      const storageKey = getGoalsStorageKey(CURRENT_UPR_ID, CURRENT_PERIOD);
      storedGoalsData = localStorage.getItem(storageKey);
    }
    
    if (storedGoalsData) {
      setGoals(JSON.parse(storedGoalsData));
    } else {
      const initialGoalsWithContext = INITIAL_GOALS_TEMPLATE.map(g => ({
        ...g,
        uprId: CURRENT_UPR_ID,
        period: CURRENT_PERIOD,
      }));
      setGoals(initialGoalsWithContext);
      if (typeof window !== 'undefined') {
        const storageKey = getGoalsStorageKey(CURRENT_UPR_ID, CURRENT_PERIOD);
        localStorage.setItem(storageKey, JSON.stringify(initialGoalsWithContext));
      }
    }
  }, []);

  const updateLocalStorage = (updatedGoals: Goal[]) => {
    if (typeof window !== 'undefined') {
      const storageKey = getGoalsStorageKey(CURRENT_UPR_ID, CURRENT_PERIOD);
      localStorage.setItem(storageKey, JSON.stringify(updatedGoals));
    }
  };

  const handleGoalSave = (goal: Goal) => {
    // Ensure the goal has the current UPR ID and Period
    const goalWithContext = {
      ...goal,
      uprId: CURRENT_UPR_ID,
      period: CURRENT_PERIOD,
    };

    setGoals(prevGoals => {
      const existingIndex = prevGoals.findIndex(g => g.id === goalWithContext.id);
      let updatedGoals;
      if (existingIndex > -1) {
        updatedGoals = [...prevGoals];
        updatedGoals[existingIndex] = goalWithContext;
        toast({ title: "Goal Updated", description: `Goal "${goalWithContext.name}" has been successfully updated.` });
      } else {
        updatedGoals = [goalWithContext, ...prevGoals];
        toast({ title: "Goal Added", description: `New goal "${goalWithContext.name}" has been successfully added.` });
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
      
      if (typeof window !== 'undefined' && goalToDelete) {
        const risksStorageKey = getRisksStorageKey(goalToDelete.uprId, goalToDelete.period, goalId);
        const storedRisks = localStorage.getItem(risksStorageKey);
        if (storedRisks) {
          localStorage.removeItem(risksStorageKey);
          const risks: Array<{id: string}> = JSON.parse(storedRisks);
          risks.forEach(risk => {
            const controlsStorageKey = getControlsStorageKey(goalToDelete.uprId, goalToDelete.period, risk.id);
            localStorage.removeItem(controlsStorageKey);
          });
        }
      }
      return updatedGoals;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Goals for UPR: ${CURRENT_UPR_ID} (Period: ${CURRENT_PERIOD})`}
        description="Define and manage your strategic objectives for the current unit and period."
        actions={
          <AddGoalDialog 
            onGoalSave={handleGoalSave}
            currentUprId={CURRENT_UPR_ID}
            currentPeriod={CURRENT_PERIOD}
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
          <h3 className="mt-2 text-lg font-medium">No goals yet for this UPR/Period</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first goal.
          </p>
          <div className="mt-6">
            <AddGoalDialog 
              onGoalSave={handleGoalSave} 
              currentUprId={CURRENT_UPR_ID}
              currentPeriod={CURRENT_PERIOD}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
