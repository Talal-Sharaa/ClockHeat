
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Trophy, Info, AlertCircle, Loader2, CalendarDays, ListChecks } from "lucide-react";
import type { Goal, GoalProgressData, ClockifyUser, ClockifyTimeEntry } from "@/types";
import { getClockifyTimeEntries } from "@/lib/clockifyService";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
  differenceInSeconds,
  isValid,
  startOfDay,
  endOfDay,
} from "date-fns";

const GOALS_STORAGE_KEY = "timeflow_goals_list"; // Updated key

interface GoalProgressCardProps {
  currentUser: ClockifyUser | null;
  workspaceId?: string;
  // rawTimeEntries no longer needed as primary source for goal progress
}

export function GoalProgressCard({ currentUser, workspaceId }: GoalProgressCardProps) {
  const [allGoalProgressData, setAllGoalProgressData] = React.useState<GoalProgressData[]>([]);
  const [isOverallLoading, setIsOverallLoading] = React.useState(true);
  const [overallError, setOverallError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAllGoalsAndProgress = async () => {
      setIsOverallLoading(true);
      setOverallError(null);
      setAllGoalProgressData([]); // Clear previous data

      let loadedGoals: Goal[] = [];
      try {
        const storedGoalsString = localStorage.getItem(GOALS_STORAGE_KEY);
        if (storedGoalsString) {
          loadedGoals = JSON.parse(storedGoalsString);
        }
      } catch (e) {
        console.error("Error loading goals from localStorage:", e);
        setOverallError("Could not load goal settings.");
        setIsOverallLoading(false);
        return;
      }

      if (loadedGoals.length === 0) {
        setIsOverallLoading(false);
        return; // No goals set
      }

      if (!currentUser || !currentUser.id || !workspaceId) {
        setOverallError("User or workspace information is missing for goal tracking.");
        setIsOverallLoading(false);
        loadedGoals.forEach(goal => {
           // Initialize with error for each goal if user/workspace missing
           const { periodStart, periodEnd } = determineGoalPeriod(goal);
           setAllGoalProgressData(prev => [...prev, {
                ...goal,
                trackedHours: 0,
                periodStart,
                periodEnd,
                isLoading: false,
                error: "User/workspace info missing.",
            }]);
        });
        return;
      }
      
      // Initialize progress data with loading states
      const initialProgressData = loadedGoals.map(goal => {
        const { periodStart, periodEnd } = determineGoalPeriod(goal);
        return {
          ...goal,
          trackedHours: 0,
          periodStart,
          periodEnd,
          isLoading: true,
          error: null,
        };
      });
      setAllGoalProgressData(initialProgressData);

      // Fetch entries for each goal
      const progressPromises = loadedGoals.map(async (goal) => {
        const { periodStart, periodEnd } = determineGoalPeriod(goal);
        try {
          const entriesForGoalPeriod = await getClockifyTimeEntries({
            workspaceId: workspaceId!,
            userId: currentUser!.id,
            startDate: periodStart,
            endDate: periodEnd,
          });

          let trackedSecondsInPeriod = 0;
          entriesForGoalPeriod.forEach(entry => {
            if (!entry.timeInterval || !entry.timeInterval.start) return;
            const entryStartDate = parseISO(entry.timeInterval.start);
            if (isValid(entryStartDate) && isWithinInterval(entryStartDate, { start: periodStart, end: periodEnd })) {
              let durationSecondsValue = 0;
              if (entry.timeInterval.end) {
                const entryEndDate = parseISO(entry.timeInterval.end);
                if(isValid(entryEndDate)) durationSecondsValue = differenceInSeconds(entryEndDate, entryStartDate);
              } else if (entry.timeInterval.duration) {
                const durationMatch = entry.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (durationMatch) {
                  const hours = parseInt(durationMatch[1] || '0');
                  const minutes = parseInt(durationMatch[2] || '0');
                  const seconds = parseInt(durationMatch[3] || '0');
                  durationSecondsValue = (hours * 3600) + (minutes * 60) + seconds;
                }
              }
              trackedSecondsInPeriod += durationSecondsValue;
            }
          });
          const trackedHours = parseFloat((trackedSecondsInPeriod / 3600).toFixed(2));
          return { ...goal, trackedHours, periodStart, periodEnd, isLoading: false, error: null };
        } catch (fetchError: any) {
          console.error(`Error fetching time entries for goal "${goal.name}":`, fetchError);
          return { ...goal, trackedHours: 0, periodStart, periodEnd, isLoading: false, error: fetchError.message || "Failed to fetch progress" };
        }
      });

      const settledProgress = await Promise.allSettled(progressPromises);
      const finalProgressData: GoalProgressData[] = settledProgress.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // This case should ideally be handled by the error in the promise itself,
          // but as a fallback:
          const originalGoal = initialProgressData.find(g => g.id === (result.reason as any)?.id) || initialProgressData[0]; // Find a way to get original goal id
          const {periodStart, periodEnd} = determineGoalPeriod(originalGoal);
          return { ...originalGoal, trackedHours:0, isLoading: false, error: "Processing failed", periodStart, periodEnd };
        }
      });
      
      setAllGoalProgressData(finalProgressData);
      setIsOverallLoading(false);
    };

    fetchAllGoalsAndProgress();
  }, [currentUser, workspaceId]); // Re-run if user or workspace changes, or when `key` prop changes via `onGoalUpdated`

  const determineGoalPeriod = (goal: Goal): { periodStart: Date; periodEnd: Date } => {
    let periodStart: Date;
    let periodEnd: Date;
    const now = new Date();

    if (goal.customPeriodStart && goal.customPeriodEnd) {
      const customStart = parseISO(goal.customPeriodStart);
      const customEnd = parseISO(goal.customPeriodEnd);
      if (isValid(customStart) && isValid(customEnd) && customStart <= customEnd) {
        periodStart = startOfDay(customStart);
        periodEnd = endOfDay(customEnd);
      } else {
        console.warn(`Invalid custom period for goal "${goal.name}", falling back.`);
        periodStart = goal.type === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
        periodEnd = goal.type === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
      }
    } else {
      periodStart = goal.type === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
      periodEnd = goal.type === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
    }
    return { periodStart, periodEnd };
  };


  if (isOverallLoading && allGoalProgressData.length === 0) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            Loading Goal Progress...
          </CardTitle>
          <Skeleton className="h-4 w-3/4 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (overallError) { 
    return (
         <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center text-lg text-destructive">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Goal Progress Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-destructive-foreground">{overallError}</p>
            </CardContent>
        </Card>
    );
  }

  if (allGoalProgressData.length === 0) { 
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Info className="mr-2 h-5 w-5 text-muted-foreground" />
            No Goals Set
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Set some goals in the "Set Your Work Goal" card to track your progress!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <ListChecks className="mr-2 h-5 w-5 text-primary" />
          Your Goal Progress
        </CardTitle>
        <CardDescription>Track progress across all your defined goals.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-3"> {/* Adjust height as needed */}
          <div className="space-y-6">
            {allGoalProgressData.map((goalData) => {
              const progressPercentage = goalData.hours > 0 ? Math.min((goalData.trackedHours / goalData.hours) * 100, 100) : 0;
              let periodName: string;
              let periodRange: string;

              if (goalData.customPeriodStart && goalData.customPeriodEnd && isValid(goalData.periodStart) && isValid(goalData.periodEnd)) {
                periodName = "Custom Period";
                periodRange = `${format(goalData.periodStart, 'LLL d')} - ${format(goalData.periodEnd, 'LLL d, yyyy')}`;
              } else {
                periodName = goalData.type === 'weekly' ? 'This Week' : 'This Month';
                periodRange = (isValid(goalData.periodStart) && isValid(goalData.periodEnd)) 
                  ? `${format(goalData.periodStart, 'LLL d')} - ${format(goalData.periodEnd, 'LLL d, yyyy')}` 
                  : "Current Period";
              }

              return (
                <div key={goalData.id} className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="text-md font-semibold flex items-center mb-1">
                    {progressPercentage >= 100 && !goalData.isLoading ? (
                      <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                    ) : (
                      <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                    )}
                    {goalData.name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center mb-2">
                    <CalendarDays className="mr-1.5 h-3 w-3"/> 
                    {periodName}: {periodRange}
                  </p>

                  {goalData.isLoading ? (
                    <div className="space-y-2 mt-1">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-full rounded-full" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : goalData.error ? (
                    <p className="text-xs text-destructive">Error: {goalData.error}</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-bold text-primary">
                          {goalData.trackedHours.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {goalData.hours.toLocaleString()} hours
                        </span>
                      </div>
                      <Progress value={progressPercentage} aria-label={`${progressPercentage.toFixed(0)}% of goal completed`} className="mt-1 mb-1 h-3"/>
                      {progressPercentage >= 100 ? (
                        <p className="text-xs font-medium text-green-600">
                          Goal Achieved!
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {progressPercentage.toFixed(0)}% completed.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

