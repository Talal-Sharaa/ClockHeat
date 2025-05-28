
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClockifyWorkspace, ClockifyProject } from "@/types";

const ALL_PROJECTS_VALUE = "_all_"; 

interface DataFiltersProps {
  workspaces: ClockifyWorkspace[];
  projects: ClockifyProject[];
  isLoadingWorkspaces: boolean;
  isLoadingProjects: boolean;
  selectedWorkspaceId?: string;
  selectedProjectId?: string; 
  dateRange?: { from?: Date; to?: Date };
  onFiltersChange: (filters: {
    workspaceId?: string;
    projectId?: string; 
    dateRange?: { from?: Date; to?: Date };
  }) => void;
  disabled?: boolean; // New prop to disable filters
}

export function DataFilters({
  workspaces,
  projects,
  isLoadingWorkspaces,
  isLoadingProjects,
  selectedWorkspaceId,
  selectedProjectId,
  dateRange: initialDateRange,
  onFiltersChange,
  disabled = false, // Default to false
}: DataFiltersProps) {
  
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState<string | undefined>(selectedWorkspaceId);
  const [currentProjectId, setCurrentProjectId] = React.useState<string | undefined>(selectedProjectId);
  const [currentDateRange, setCurrentDateRange] = React.useState<{ from?: Date; to?: Date } | undefined>(initialDateRange);

  React.useEffect(() => {
    setCurrentWorkspaceId(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  React.useEffect(() => {
    setCurrentProjectId(selectedProjectId);
  }, [selectedProjectId]);
  
  React.useEffect(() => {
    setCurrentDateRange(initialDateRange);
  }, [initialDateRange]);


  const handleWorkspaceChange = (value: string) => {
    setCurrentWorkspaceId(value);
    setCurrentProjectId(undefined); 
  };

  const handleProjectChange = (value: string) => {
    setCurrentProjectId(value);
  };
  
  const handleDateRangeChange = (newDateRange: { from?: Date; to?: Date } | undefined) => {
    setCurrentDateRange(newDateRange);
  };

  const handleApplyFilters = () => {
    onFiltersChange({
      workspaceId: currentWorkspaceId,
      projectId: currentProjectId === ALL_PROJECTS_VALUE ? undefined : currentProjectId,
      dateRange: currentDateRange,
    });
  };
  
  const projectSelectValue = currentProjectId;


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Filter className="mr-2 h-5 w-5 text-primary" />
          Filter Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            {isLoadingWorkspaces && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            <Select 
              value={currentWorkspaceId} 
              onValueChange={handleWorkspaceChange}
              disabled={isLoadingWorkspaces || workspaces.length === 0 || disabled}
            >
              <SelectTrigger disabled={disabled}>
                <SelectValue placeholder="Select Workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
             {isLoadingProjects && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            <Select 
              value={projectSelectValue} 
              onValueChange={handleProjectChange} 
              disabled={isLoadingProjects || !currentWorkspaceId || projects.length === 0 || disabled}
            >
              <SelectTrigger disabled={disabled}>
                <SelectValue placeholder="Select Project (Optional)" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value={ALL_PROJECTS_VALUE}>All Projects</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !currentDateRange?.from && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentDateRange?.from ? (
                  currentDateRange.to ? (
                    <>
                      {format(currentDateRange.from, "LLL dd, y")} -{" "}
                      {format(currentDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(currentDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={currentDateRange?.from}
                selected={currentDateRange}
                onSelect={(range) => handleDateRangeChange(range ? {from: range.from, to: range.to} : undefined)}
                numberOfMonths={2}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleApplyFilters} className="w-full sm:w-auto" disabled={isLoadingWorkspaces || isLoadingProjects || disabled}>
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  );
}
