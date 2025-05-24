
"use client";

import type { PotentialRisk, Control, RiskCause, LikelihoodImpactLevel } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ShieldCheck, Edit, Trash2, Settings2, PlusCircle, Zap, ListChecks } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RiskListItemProps {
  potentialRisk: PotentialRisk;
  controls: Control[];
  riskCauses: RiskCause[];
  onAnalyze: (potentialRisk: PotentialRisk) => void;
  onAddControl: (potentialRisk: PotentialRisk) => void;
  onEditControl: (control: Control) => void;
  onDeletePotentialRisk: (potentialRiskId: string) => void;
  onDeleteControl: (controlId: string) => void;
  onManageCauses: (potentialRisk: PotentialRisk) => void; 
  onEditDetails: (potentialRiskId: string) => void; // New prop for navigating to edit page
}

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  if (score >= 3) return 'Low';
  return 'Very Low';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'bg-red-600 hover:bg-red-700';
    case 'high': return 'bg-orange-500 hover:bg-orange-600';
    case 'medium': return 'bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black';
    case 'low': return 'bg-green-500 hover:bg-green-600';
    case 'very low': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};


export function RiskListItem({ 
  potentialRisk, 
  controls, 
  riskCauses,
  onAnalyze, 
  onAddControl, 
  onEditControl, 
  onDeletePotentialRisk, 
  onDeleteControl,
  onManageCauses,
  onEditDetails
}: RiskListItemProps) {
  const riskLevel = getRiskLevel(potentialRisk.likelihood, potentialRisk.impact);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{potentialRisk.description}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditDetails(potentialRisk.id)}> 
                <Edit className="mr-2 h-4 w-4" /> Edit Details & Causes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageCauses(potentialRisk)}>
                <Zap className="mr-2 h-4 w-4" /> Manage Causes (Quick)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAnalyze(potentialRisk)}>
                <BarChart3 className="mr-2 h-4 w-4" /> Analyze Level
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddControl(potentialRisk)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Control
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeletePotentialRisk(potentialRisk.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Potential Risk
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          Identified: {new Date(potentialRisk.identifiedAt).toLocaleDateString()} <br />
          Category: <Badge variant="outline" className="text-xs">{potentialRisk.category || 'N/A'}</Badge> | 
          Owner: <Badge variant="outline" className="text-xs">{potentialRisk.owner || 'N/A'}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm font-medium">Likelihood: </span>
            <Badge variant={potentialRisk.likelihood ? "secondary" : "outline"}>{potentialRisk.likelihood || 'Not set'}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Impact: </span>
            <Badge variant={potentialRisk.impact ? "secondary" : "outline"}>{potentialRisk.impact || 'Not set'}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Level: </span>
             <Badge className={`${getRiskLevelColor(riskLevel)} text-white`}>
                {riskLevel}
             </Badge>
          </div>
        </div>
        
        {riskCauses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1 flex items-center">
              <ListChecks className="h-4 w-4 mr-1 text-muted-foreground" />
              Potential Causes ({riskCauses.length}):
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-4">
              {riskCauses.slice(0, 3).map(cause => ( // Show max 3 causes initially
                <li key={cause.id} className="text-sm text-muted-foreground">
                  {cause.description} <Badge variant="outline" className="ml-1 text-xs">{cause.source}</Badge>
                </li>
              ))}
              {riskCauses.length > 3 && <li className="text-xs text-muted-foreground">...and {riskCauses.length - 3} more.</li>}
            </ul>
             <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => onManageCauses(potentialRisk)}>
                View/Manage All Causes
            </Button>
          </div>
        )}
        {riskCauses.length === 0 && (
             <Button variant="outline" size="sm" onClick={() => onManageCauses(potentialRisk)}>
                <Zap className="mr-2 h-4 w-4" /> Add/Manage Causes
            </Button>
        )}
        
        {controls.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold mb-1 flex items-center">
                <ShieldCheck className="h-4 w-4 mr-1 text-muted-foreground" />
                Controls ({controls.length}):
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-4">
              {controls.map(control => (
                <li key={control.id} className="text-sm text-muted-foreground flex justify-between items-center group">
                  <span>
                    {control.description} <Badge variant="outline" className="ml-1 text-xs">{control.status}</Badge>
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEditControl(control)} aria-label="Edit control">
                      <Edit className="h-3 w-3" />
                    </Button>
                     <Button variant="ghost" size="icon-sm" onClick={() => onDeleteControl(control.id)} aria-label="Delete control">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {controls.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => onAddControl(potentialRisk)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Control Measure
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

    