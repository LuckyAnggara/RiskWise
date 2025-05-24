
// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUprId, getCurrentPeriod, setCurrentPeriod, getAvailablePeriods, addAvailablePeriod, initializeAppContext } from '@/lib/upr-period-context';
import { Info, PlusCircle } from 'lucide-react';

export default function SettingsPage() {
  const [currentUpr, setCurrentUpr] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [newPeriodInput, setNewPeriodInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const context = initializeAppContext(); // Ensures defaults are set if not present
    setCurrentUpr(context.uprId);
    setSelectedPeriod(context.period);
    setAvailablePeriods(context.availablePeriods);
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod && newPeriod !== selectedPeriod) {
      setCurrentPeriod(newPeriod); // This will also trigger a page reload
      setSelectedPeriod(newPeriod); // Optimistically update state, though reload will fetch fresh
      toast({ title: "Period Changed", description: `Active period set to ${newPeriod}. Page will reload.` });
    }
  };

  const handleAddNewPeriod = () => {
    if (!newPeriodInput.trim()) {
      toast({ title: "Error", description: "Period cannot be empty.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}\/\d{4}$/.test(newPeriodInput.trim()) && !/^\d{4}-(S1|S2|Q1|Q2|Q3|Q4)$/i.test(newPeriodInput.trim())) {
      toast({ title: "Invalid Format", description: "Use YYYY, YYYY/YYYY, or YYYY-S1/S2/Q1-Q4 format.", variant: "destructive" });
      return;
    }
    const updatedPeriods = addAvailablePeriod(newPeriodInput.trim());
    setAvailablePeriods(updatedPeriods);
    if (!updatedPeriods.includes(selectedPeriod) && updatedPeriods.length > 0) {
      // If the current selected period was somehow removed (not typical here) or if it's the first period added
      setSelectedPeriod(updatedPeriods[0]); 
    }
    toast({ title: "Period Added", description: `Period "${newPeriodInput.trim()}" added to available list.` });
    setNewPeriodInput('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Settings"
        description="Manage global settings for RiskWise."
      />

      <Card>
        <CardHeader>
          <CardTitle>Unit Pemilik Risiko (UPR) &amp; Periode</CardTitle>
          <CardDescription>
            Configure the active UPR and reporting period for the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentUpr">Current UPR ID</Label>
            <Input id="currentUpr" value={currentUpr} readOnly disabled />
            <p className="text-xs text-muted-foreground flex items-center">
              <Info className="w-3 h-3 mr-1" /> UPR ID is currently set system-wide and not changeable via this UI yet.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="currentPeriod">Active Period</Label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger id="currentPeriod" className="w-[280px]">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.length > 0 ? (
                  availablePeriods.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-periods" disabled>No periods defined.</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing the active period will reload the application.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Available Periods</CardTitle>
          <CardDescription>Add new reporting periods to the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-grow space-y-1">
              <Label htmlFor="newPeriod">New Period (e.g., 2026, 2025/2026, 2025-S1)</Label>
              <Input
                id="newPeriod"
                value={newPeriodInput}
                onChange={(e) => setNewPeriodInput(e.target.value)}
                placeholder="Enter new period"
              />
            </div>
            <Button onClick={handleAddNewPeriod} type="button">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Period
            </Button>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Currently Available Periods:</h4>
            {availablePeriods.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {availablePeriods.map(p => <li key={p}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No periods defined yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
