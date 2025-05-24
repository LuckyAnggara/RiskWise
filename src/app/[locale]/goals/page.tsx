
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { GoalCard } from '@/components/goals/goal-card';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import type { Goal, PotentialRisk } from '@/lib/types';
import { PlusCircle, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { useTranslations } from 'next-intl';

const INITIAL_GOALS_TEMPLATE: Omit<Goal, 'uprId' | 'period'>[] = [
  { id: 'g1', name: 'Launch New Product X', description: 'Successfully develop and launch Product X by Q4 to capture 5% market share within the first year.', createdAt: '2023-10-15T10:00:00Z' },
  { id: 'g2', name: 'Improve Customer Satisfaction', description: 'Increase overall customer satisfaction (CSAT) score from 80% to 90% by end of year through improved support and product usability.', createdAt: '2023-11-01T14:30:00Z' },
  { id: 'g3', name: 'Expand to New Market', description: 'Establish a market presence in at least 3 key new regions by mid-next year, achieving initial sales targets.', createdAt: '2024-01-20T09:15:00Z' },
];

const getGoalsStorageKey = (uprId: string, period: string) => `riskwise-upr${uprId}-period${period}-goals`;
const getPotentialRisksStorageKey = (uprId: string, period: string, goalId: string) => `riskwise-upr${uprId}-period${period}-goal${goalId}-potentialRisks`;
const getControlsStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-controls`;
const getRiskCausesStorageKey = (uprId: string, period: string, potentialRiskId: string) => `riskwise-upr${uprId}-period${period}-potentialRisk${potentialRiskId}-causes`;


export default function GoalsPage() {
  const t = useTranslations('GoalsPage');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentUprId, setCurrentUprId] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const context = initializeAppContext();
      const uprId = context.uprId;
      const period = context.period;
      setCurrentUprId(uprId);
      setCurrentPeriod(period);

      const storageKey = getGoalsStorageKey(uprId, period);
      const storedGoalsData = localStorage.getItem(storageKey);
    
      if (storedGoalsData) {
        setGoals(JSON.parse(storedGoalsData));
      } else {
        const initialGoalsWithContext = INITIAL_GOALS_TEMPLATE.map(g => ({
          ...g,
          uprId: uprId,
          period: period,
        }));
        setGoals(initialGoalsWithContext);
        localStorage.setItem(storageKey, JSON.stringify(initialGoalsWithContext));
      }
      setIsLoading(false);
    }
  }, []);

  const updateLocalStorage = (updatedGoals: Goal[]) => {
    if (typeof window !== 'undefined' && currentUprId && currentPeriod) {
      const storageKey = getGoalsStorageKey(currentUprId, currentPeriod);
      localStorage.setItem(storageKey, JSON.stringify(updatedGoals));
    }
  };

  const handleGoalSave = (goal: Goal) => {
    setGoals(prevGoals => {
      const existingIndex = prevGoals.findIndex(g => g.id === goal.id);
      let updatedGoals;
      if (existingIndex > -1) {
        updatedGoals = prevGoals.map(g => g.id === goal.id ? goal : g);
        toast({ title: t('toastGoalUpdatedTitle'), description: t('toastGoalUpdatedDescription', { name: goal.name }) });
      } else {
        updatedGoals = [goal, ...prevGoals];
        toast({ title: t('toastGoalAddedTitle'), description: t('toastGoalAddedDescription', { name: goal.name }) });
      }
      updateLocalStorage(updatedGoals);
      return updatedGoals;
    });
  };

  const handleGoalDelete = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete || !currentUprId || !currentPeriod) return;

    setGoals(prevGoals => {
      const updatedGoals = prevGoals.filter(g => g.id !== goalId);
      updateLocalStorage(updatedGoals);
      toast({ title: t('toastGoalDeletedTitle'), description: t('toastGoalDeletedDescription', { name: goalToDelete.name }), variant: "destructive" });
      
      if (typeof window !== 'undefined') {
        const potentialRisksStorageKey = getPotentialRisksStorageKey(currentUprId, currentPeriod, goalId);
        const storedPotentialRisks = localStorage.getItem(potentialRisksStorageKey);
        if (storedPotentialRisks) {
          localStorage.removeItem(potentialRisksStorageKey);
          const pRisks: PotentialRisk[] = JSON.parse(storedPotentialRisks);
          pRisks.forEach(pRisk => {
            localStorage.removeItem(getControlsStorageKey(currentUprId, currentPeriod, pRisk.id));
            localStorage.removeItem(getRiskCausesStorageKey(currentUprId, currentPeriod, pRisk.id));
          });
        }
      }
      return updatedGoals;
    });
  };
  
  // Add translations for toast messages to en.json and id.json
  // Example for en.json:
  // "toastGoalUpdatedTitle": "Goal Updated",
  // "toastGoalUpdatedDescription": "Goal \"{name}\" has been successfully updated.",
  // "toastGoalAddedTitle": "Goal Added",
  // "toastGoalAddedDescription": "New goal \"{name}\" has been successfully added.",
  // "toastGoalDeletedTitle": "Goal Deleted",
  // "toastGoalDeletedDescription": "Goal \"{name}\" has been deleted."

  if (isLoading || !currentUprId || !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">{t('loadingData')}</p>
      </div>
    );
  }
 // Add "loadingData": "Loading goals data..." to en.json

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description', { uprId: currentUprId, period: currentPeriod })}
        actions={
          <AddGoalDialog 
            onGoalSave={handleGoalSave}
            currentUprId={currentUprId}
            currentPeriod={currentPeriod}
            triggerButton={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('addNewGoal')}
              </Button>
            }
          />
        }
      />

      {goals.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">{t('noGoalsYet')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('getStartedAddingGoal')}
          </p>
          <div className="mt-6">
            <AddGoalDialog 
              onGoalSave={handleGoalSave} 
              currentUprId={currentUprId}
              currentPeriod={currentPeriod}
              triggerButton={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> {t('addNewGoal')}
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
              // Potential risk count can be fetched or passed if needed, simplified for now
            />
          ))}
        </div>
      )}
    </div>
  );
}
