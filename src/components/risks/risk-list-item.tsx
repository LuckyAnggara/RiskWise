
"use client";

import type { Risk, Control, LikelihoodImpactLevel } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ShieldCheck, Edit, Trash2, Settings2, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RiskListItemProps {
  risk: Risk;
  controls: Control[];
  onAnalyze: (risk: Risk) => void;
  onAddControl: (risk: Risk) => void;
  onEditControl: (control: Control) => void;
  onDeleteRisk: (riskId: string) => void;
  onDeleteControl: (controlId: string) => void;
}

const getRiskLevel = (likelihood: LikelihoodImpactLevel | null, impact: LikelihoodImpactLevel | null): string => {
  if (!likelihood || !impact) return 'N/A';
  const L = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const I = { 'Very Low': 1, 'Low': 2, 'Medium': 3, 'High': 4, 'Very High': 5 };
  const score = L[likelihood] * I[impact];

  if (score >= 20) return 'Critical'; // e.g. Very High * Very High
  if (score >= 12) return 'High';   // e.g. High * High / Very High * Medium
  if (score >= 6) return 'Medium';  // e.g. Medium * Medium / High * Low
  if (score >= 3) return 'Low';     // e.g. Low * Low / Medium * Very Low
  return 'Very Low';
};

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'bg-red-600 hover:bg-red-700';
    case 'high': return 'bg-orange-500 hover:bg-orange-600';
    case 'medium': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 hover:bg-green-600';
    case 'very low': return 'bg-sky-500 hover:bg-sky-600';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};


export function RiskListItem({ risk, controls, onAnalyze, onAddControl, onEditControl, onDeleteRisk, onDeleteControl }: RiskListItemProps) {
  const riskLevel = getRiskLevel(risk.likelihood, risk.impact);
  const riskControls = controls.filter(c => c.riskId === risk.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{risk.description}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAnalyze(risk)}>
                <BarChart3 className="mr-2 h-4 w-4" /> Analyze Risk
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddControl(risk)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Control
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteRisk(risk.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Risk
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>Identified: {new Date(risk.identifiedAt).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm font-medium">Likelihood: </span>
            <Badge variant={risk.likelihood ? "secondary" : "outline"}>{risk.likelihood || 'Not set'}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Impact: </span>
            <Badge variant={risk.impact ? "secondary" : "outline"}>{risk.impact || 'Not set'}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Level: </span>
             <Badge className={`${getRiskLevelColor(riskLevel)} text-white`}>
                {riskLevel}
             </Badge>
          </div>
        </div>
        
        {riskControls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Controls:</h4>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {riskControls.map(control => (
                <li key={control.id} className="text-sm text-muted-foreground flex justify-between items-center">
                  <span>
                    {control.description} <Badge variant="outline" className="ml-1 text-xs">{control.status}</Badge>
                  </span>
                  <div>
                    <Button variant="ghost" size="icon-sm" onClick={() => onEditControl(control)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                     <Button variant="ghost" size="icon-sm" onClick={() => onDeleteControl(control.id)}>
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
        {riskControls.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => onAddControl(risk)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Control Measure
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Add size="icon-sm" to buttonVariants if not present
// In components/ui/button.tsx, add to variants:
// size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10", "icon-sm": "h-8 w-8" }
// For now, using standard icon size and padding adjustment via className if needed.
