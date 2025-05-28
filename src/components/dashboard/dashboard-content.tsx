
"use client";

import * as React from "react";
import { DataFilters } from "@/components/dashboard/data-filters";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { HeatmapCalendar } from "@/components/dashboard/heatmap-calendar";
import { AIInsightsForm } from "@/components/dashboard/ai-insights-form";
import { ApiKeyForm } from "@/components/dashboard/api-key-form";
import { GoalSettingsCard } from "@/components/dashboard/goal-settings-card";
import { GoalProgressCard } from "@/components/dashboard/goal-progress-card";
import { DetailedTimeEntriesModal } from "@/components/dashboard/detailed-time-entries-modal";
import type { HeatmapDataPoint, ClockifyWorkspace, ClockifyProject, ClockifyTimeEntry, ClockifyUser, DailyTimeSummary, ProjectHours, SummaryStatsData } from "@/types";
import {
  getCurrentClockifyUser,
  getClockifyWorkspaces,
  getClockifyProjects,
  getClockifyTimeEntries,
  processTimeEntriesForDailySummary,
  setClockifyApiKey,
  getClockifyApiKey
} from "@/lib/clockifyService";
import { startOfYear, endOfYear, parseISO, differenceInSeconds, isValid, startOfDay, endOfDay, getYear, eachYearOfInterval, format, differenceInCalendarMonths, addMonths, isBefore, subMonths, isWithinInterval } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Inbox, Download } from "lucide-react";
import { ClockHeatLogoIcon } from "@/components/icons/clockheat-logo-icon";
import { SummaryStatsSkeleton } from "./summary-stats-skeleton";
import { HeatmapCalendarSkeleton } from "./heatmap-calendar-skeleton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";


const LOCAL_STORAGE_WORKSPACE_ID = 'timeflow_filters_workspaceId';
const LOCAL_STORAGE_PROJECT_ID = 'timeflow_filters_projectId';
const LOCAL_STORAGE_DATE_RANGE_FROM = 'timeflow_filters_dateRange_from';
const LOCAL_STORAGE_DATE_RANGE_TO = 'timeflow_filters_dateRange_to';


export function DashboardContent({}) {
  const [userApiKey, setUserApiKey] = React.useState<string | null>(null);
  const [showApiKeyForm, setShowApiKeyForm] = React.useState(false);
  const [apiKeyFormError, setApiKeyFormError] = React.useState<string | null>(null);

  const [currentUser, setCurrentUser] = React.useState<ClockifyUser | null>(null);
  const [workspaces, setWorkspaces] = React.useState<ClockifyWorkspace[]>([]);
  const [projects, setProjects] = React.useState<ClockifyProject[]>([]);
  const [rawTimeEntries, setRawTimeEntries] = React.useState<ClockifyTimeEntry[]>([]);
  const [dailySummaries, setDailySummaries] = React.useState<DailyTimeSummary[]>([]);

  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = React.useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const [currentFilters, setCurrentFilters] = React.useState<{
    workspaceId?: string;
    projectId?: string;
    dateRange: { from: Date; to: Date };
  }>({
    dateRange: { from: startOfYear(new Date()), to: endOfYear(new Date()) }
  });

  React.useEffect(() => {
    const initialDateRangeFromLocalStorage = () => {
        const storedDateFromStr = localStorage.getItem(LOCAL_STORAGE_DATE_RANGE_FROM);
        const storedDateToStr = localStorage.getItem(LOCAL_STORAGE_DATE_RANGE_TO);
        let loadedDateFrom: Date | null = null;
        let loadedDateTo: Date | null = null;

        if (storedDateFromStr) {
            const parsed = parseISO(storedDateFromStr);
            if (isValid(parsed)) loadedDateFrom = parsed;
        }
        if (storedDateToStr) {
            const parsed = parseISO(storedDateToStr);
            if (isValid(parsed)) loadedDateTo = parsed;
        }
        const today = new Date();
        if (loadedDateFrom && loadedDateTo && loadedDateFrom <= loadedDateTo) {
          return { from: loadedDateFrom, to: loadedDateTo };
        }
        return { from: startOfYear(today), to: endOfYear(today) };
    };
    
    setCurrentFilters(prev => ({
      ...prev,
      workspaceId: localStorage.getItem(LOCAL_STORAGE_WORKSPACE_ID) || prev.workspaceId,
      projectId: localStorage.getItem(LOCAL_STORAGE_PROJECT_ID) || prev.projectId,
      dateRange: initialDateRangeFromLocalStorage(),
    }));
  }, []);


  const { toast } = useToast();
  const [goalUpdateKey, setGoalUpdateKey] = React.useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = React.useState<Date | null>(null);
  const [detailedTimeEntries, setDetailedTimeEntries] = React.useState<ClockifyTimeEntry[]>([]);
  const [isLoadingDetailedEntries, setIsLoadingDetailedEntries] = React.useState(false);
  const [detailedEntriesError, setDetailedEntriesError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const storedKey = getClockifyApiKey();
    if (storedKey) {
      setUserApiKey(storedKey);
      setClockifyApiKey(storedKey);
      fetchAllClockifyData(storedKey);
    } else {
      setShowApiKeyForm(true);
      setIsLoadingUser(false);
    }
  }, []);


  React.useEffect(() => {
    if (currentFilters.workspaceId) {
      localStorage.setItem(LOCAL_STORAGE_WORKSPACE_ID, currentFilters.workspaceId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_WORKSPACE_ID);
    }
    if (currentFilters.projectId) {
      localStorage.setItem(LOCAL_STORAGE_PROJECT_ID, currentFilters.projectId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_PROJECT_ID);
    }
    if (currentFilters.dateRange.from && isValid(currentFilters.dateRange.from)) {
        localStorage.setItem(LOCAL_STORAGE_DATE_RANGE_FROM, currentFilters.dateRange.from.toISOString());
    }
    if (currentFilters.dateRange.to && isValid(currentFilters.dateRange.to)) {
        localStorage.setItem(LOCAL_STORAGE_DATE_RANGE_TO, currentFilters.dateRange.to.toISOString());
    }
  }, [currentFilters]);


  const fetchAllClockifyData = React.useCallback(async (apiKeyToUse: string | null) => {
    if (!apiKeyToUse) {
      setShowApiKeyForm(true);
      setIsLoadingUser(false);
      setCurrentUser(null);
      setWorkspaces([]);
      setProjects([]);
      setRawTimeEntries([]);
      setDailySummaries([]);
      return;
    }

    setIsLoadingUser(true);
    setError(null);
    setApiKeyFormError(null);

    try {
      const user = await getCurrentClockifyUser();
      setCurrentUser(user);

      let targetWorkspaceId = currentFilters.workspaceId || user.defaultWorkspace || user.activeWorkspace;
      
      const fetchedWorkspaces = await getClockifyWorkspaces();
      setWorkspaces(fetchedWorkspaces);

      if (fetchedWorkspaces.length > 0) {
        if (!targetWorkspaceId || !fetchedWorkspaces.find(ws => ws.id === targetWorkspaceId)) {
            targetWorkspaceId = user.defaultWorkspace && fetchedWorkspaces.find(ws => ws.id === user.defaultWorkspace) 
                                ? user.defaultWorkspace 
                                : (user.activeWorkspace && fetchedWorkspaces.find(ws => ws.id === user.activeWorkspace) 
                                    ? user.activeWorkspace 
                                    : fetchedWorkspaces[0].id);
        }
      } else {
         setError("No workspaces found for this user.");
         targetWorkspaceId = undefined; 
      }
      
      if (targetWorkspaceId && targetWorkspaceId !== currentFilters.workspaceId) {
          setCurrentFilters(prev => ({ ...prev, workspaceId: targetWorkspaceId, projectId: prev.workspaceId === targetWorkspaceId ? prev.projectId : undefined }));
      } else if (!targetWorkspaceId && fetchedWorkspaces.length === 0) {
          setCurrentFilters(prev => ({ ...prev, workspaceId: undefined, projectId: undefined }));
      }

    } catch (err) {
      handleApiError(err, "Failed to load user data.");
    } finally {
      setIsLoadingUser(false);
    }
  }, [currentFilters.workspaceId]); 


  React.useEffect(() => {
    if (!currentUser || !userApiKey) {
      setWorkspaces([]); 
      return;
    }
    async function ensureWorkspaces() {
      if (workspaces.length === 0 && !isLoadingUser) { 
        setIsLoadingWorkspaces(true);
        try {
          const fetchedWorkspaces = await getClockifyWorkspaces();
          setWorkspaces(fetchedWorkspaces);

          let needsWorkspaceUpdateInFilters = !currentFilters.workspaceId || !fetchedWorkspaces.find(ws => ws.id === currentFilters.workspaceId);
          if (needsWorkspaceUpdateInFilters) {
              let newWorkspaceId = currentUser.defaultWorkspace || currentUser.activeWorkspace;
              if (!newWorkspaceId || !fetchedWorkspaces.find(ws => ws.id === newWorkspaceId)) {
                  newWorkspaceId = fetchedWorkspaces[0]?.id;
              }
              if (newWorkspaceId) {
                  setCurrentFilters(prev => ({ ...prev, workspaceId: newWorkspaceId, projectId: undefined }));
              } else if (fetchedWorkspaces.length === 0) {
                   setError("No workspaces available for this user.");
                   setCurrentFilters(prev => ({...prev, workspaceId: undefined, projectId: undefined}));
              }
          }
        } catch (err) {
          handleApiError(err, "Failed to load workspaces.");
        } finally {
          setIsLoadingWorkspaces(false);
        }
      }
    }
    ensureWorkspaces();
  }, [currentUser, userApiKey, currentFilters.workspaceId, isLoadingUser, workspaces.length]);


  React.useEffect(() => {
    if (!currentFilters.workspaceId || !currentUser || !userApiKey) {
      setProjects([]);
      return;
    }
    async function fetchProj() {
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await getClockifyProjects(currentFilters.workspaceId!);
        setProjects(fetchedProjects);
        if (currentFilters.projectId && !fetchedProjects.find(p => p.id === currentFilters.projectId)) {
            setCurrentFilters(prev => ({ ...prev, projectId: undefined })); 
        }
      } catch (err) {
        handleApiError(err, "Failed to load projects.");
      } finally {
        setIsLoadingProjects(false);
      }
    }
    fetchProj();
  }, [currentFilters.workspaceId, currentUser, userApiKey]); 

  React.useEffect(() => {
    if (!currentUser || !currentFilters.workspaceId || !currentFilters.dateRange.from || !currentFilters.dateRange.to || !userApiKey) {
      setRawTimeEntries([]);
      setDailySummaries([]);
      return;
    }
    async function fetchEntries() {
      setIsLoadingTimeEntries(true);
      try {
        const entries = await getClockifyTimeEntries({
          workspaceId: currentFilters.workspaceId!,
          userId: currentUser!.id,
          startDate: currentFilters.dateRange.from,
          endDate: currentFilters.dateRange.to,
          projectId: currentFilters.projectId,
        });
        setRawTimeEntries(entries);
        
        const summaries = processTimeEntriesForDailySummary(entries, currentFilters.dateRange.from, currentFilters.dateRange.to);
        setDailySummaries(summaries);
        
      } catch (err) {
        handleApiError(err, "Failed to load time entries.");
        setRawTimeEntries([]);
        setDailySummaries([]);
      } finally {
        setIsLoadingTimeEntries(false);
      }
    }
    fetchEntries();
  }, [currentUser, currentFilters.workspaceId, currentFilters.projectId, currentFilters.dateRange, userApiKey]);

  const handleApiError = (err: unknown, defaultMessage: string) => {
    let errorMessage = err instanceof Error ? err.message : defaultMessage;

    const isAuthError =
      errorMessage.toLowerCase().includes("api key is not set") ||
      errorMessage.toLowerCase().includes("please enter your api key") ||
      (err instanceof Error && (err.message.includes("401") || err.message.includes("403")));

    if (isAuthError) {
      const specificAuthError = (err instanceof Error && (err.message.includes("401") || err.message.includes("403")))
        ? "Invalid API Key or permission issue. Please check and try again."
        : "Clockify API Key is not set. Please enter your API key.";
      setApiKeyFormError(specificAuthError);
      setClockifyApiKey(null); 
      setShowApiKeyForm(true);
      setCurrentUser(null); 
      setWorkspaces([]);
      setProjects([]);
      setRawTimeEntries([]);
      setDailySummaries([]);
      setError(null); 
    } else {
      setError(errorMessage);
      setApiKeyFormError(null);
    }
    console.error(defaultMessage, err);
    setIsLoadingUser(false);
    setIsLoadingWorkspaces(false);
    setIsLoadingProjects(false);
    setIsLoadingTimeEntries(false);
  };

  const handleApiKeySubmit = (newApiKey: string) => {
    setClockifyApiKey(newApiKey); 
    setUserApiKey(newApiKey);
    setShowApiKeyForm(false);
    setError(null); 
    setApiKeyFormError(null);
    fetchAllClockifyData(newApiKey); 
  };

  const handleFiltersChange = (newFilters: {
    workspaceId?: string;
    projectId?: string;
    dateRange?: { from?: Date; to?: Date };
  }) => {
    setCurrentFilters(prev => {
        const updatedWorkspaceId = newFilters.workspaceId !== undefined ? newFilters.workspaceId : prev.workspaceId;
        const workspaceChanged = updatedWorkspaceId !== prev.workspaceId;

        const newDateFrom = newFilters.dateRange?.from && isValid(newFilters.dateRange.from) ? newFilters.dateRange.from : prev.dateRange.from;
        const newDateTo = newFilters.dateRange?.to && isValid(newFilters.dateRange.to) ? newFilters.dateRange.to : prev.dateRange.to;
        
        return {
            ...prev,
            workspaceId: updatedWorkspaceId,
            projectId: workspaceChanged ? undefined : (newFilters.projectId !== undefined ? newFilters.projectId : prev.projectId),
            dateRange: { from: newDateFrom, to: newDateTo },
        };
    });
  };

  const heatmapDataForCalendar: HeatmapDataPoint[] = React.useMemo(() => {
    if (!dailySummaries || dailySummaries.length === 0) {
      return [];
    }
    return dailySummaries.map(summary => ({
      date: parseISO(summary.date),
      count: summary.totalHours,
    }));
  }, [dailySummaries]);


  const { effectiveGridStartDate, effectiveGridEndDate } = React.useMemo(() => {
    const userSelectedFrom = currentFilters.dateRange.from;
    const userSelectedTo = currentFilters.dateRange.to;

    if (!userSelectedFrom || !userSelectedTo || !isValid(userSelectedFrom) || !isValid(userSelectedTo)) {
        const today = new Date();
        return { effectiveGridStartDate: startOfYear(today), effectiveGridEndDate: endOfYear(today) };
    }

    let gridStart = userSelectedFrom;
    let gridEnd = userSelectedTo;
    
    const monthDiff = differenceInCalendarMonths(userSelectedTo, userSelectedFrom);
    if (monthDiff < 10) { 
        gridEnd = addMonths(userSelectedFrom, 10);
    }
    if (isBefore(gridEnd, userSelectedTo)) {
        gridEnd = userSelectedTo;
    }

    return { effectiveGridStartDate: gridStart, effectiveGridEndDate: gridEnd };
  }, [currentFilters.dateRange]);


  const summaryStatsData: SummaryStatsData = React.useMemo(() => {
    let totalHours = 0;
    let averageDailyHours = 0;
    let mostProductiveDay = "N/A";
    let projectHoursBreakdown: ProjectHours[] = [];

    if (dailySummaries.length > 0) {
      totalHours = dailySummaries.reduce((sum, entry) => sum + entry.totalHours, 0);
      const trackedDaysCount = dailySummaries.filter(entry => entry.totalHours > 0).length;
      averageDailyHours = trackedDaysCount > 0 ? totalHours / trackedDaysCount : 0;

      const dayOfWeekHours: { [key: number]: { count: number, totalHours: number} } = {};
      for(let i=0; i<7; i++) dayOfWeekHours[i] = {count: 0, totalHours: 0};

      dailySummaries.forEach(summary => {
          if(summary.totalHours > 0) {
              const summaryDate = parseISO(summary.date);
              if (isValid(summaryDate)) {
                const day = summaryDate.getDay(); 
                dayOfWeekHours[day].count++;
                dayOfWeekHours[day].totalHours += summary.totalHours;
              }
          }
      });

      let maxAvgHoursPerTrackedDay = 0;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      for(const dayIndex in dayOfWeekHours) {
          const dayData = dayOfWeekHours[dayIndex as unknown as number];
          if (dayData.count > 0) { 
              const avgHours = dayData.totalHours / dayData.count;
              if (avgHours > maxAvgHoursPerTrackedDay) {
                  maxAvgHoursPerTrackedDay = avgHours;
                  mostProductiveDay = dayNames[parseInt(dayIndex)];
              }
          }
      }
    }

    if ((!currentFilters.projectId || currentFilters.projectId === "_all_") && rawTimeEntries.length > 0 && projects.length > 0) {
      const projectHoursMap: { [projectId: string]: number } = {};
      
      const relevantEntries = rawTimeEntries.filter(entry => {
        const entryDate = parseISO(entry.timeInterval.start);
        return isValid(entryDate) && isWithinInterval(entryDate, {start: currentFilters.dateRange.from, end: currentFilters.dateRange.to});
      });


      relevantEntries.forEach(entry => {
        if (entry.projectId && entry.timeInterval) {
          let durationSecondsValue = 0;
          const startDate = parseISO(entry.timeInterval.start);
          if (entry.timeInterval.end && isValid(startDate)) {
            const endDate = parseISO(entry.timeInterval.end);
            if(isValid(endDate)) {
                durationSecondsValue = differenceInSeconds(endDate, startDate);
            }
          } else if (entry.timeInterval.duration) {
            const durationMatch = entry.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (durationMatch) {
              const hours = parseInt(durationMatch[1] || '0');
              const minutes = parseInt(durationMatch[2] || '0');
              const seconds = parseInt(durationMatch[3] || '0');
              durationSecondsValue = (hours * 3600) + (minutes * 60) + seconds;
            }
          }
          if (durationSecondsValue > 0) {
            projectHoursMap[entry.projectId] = (projectHoursMap[entry.projectId] || 0) + (durationSecondsValue / 3600);
          }
        }
      });
      projectHoursBreakdown = Object.entries(projectHoursMap)
        .map(([projectId, hours]) => {
          const project = projects.find(p => p.id === projectId);
          return {
            projectId,
            projectName: project ? project.name : "Unknown Project",
            totalHours: parseFloat(hours.toFixed(2)),
          };
        })
        .sort((a, b) => b.totalHours - a.totalHours);
    }

    return {
      totalHours: parseFloat(totalHours.toFixed(2)),
      averageDailyHours: parseFloat(averageDailyHours.toFixed(2)),
      mostProductiveDay,
      projectHoursBreakdown: projectHoursBreakdown.length > 0 ? projectHoursBreakdown : undefined,
    };
  }, [dailySummaries, rawTimeEntries, projects, currentFilters.projectId, currentFilters.dateRange]);


  const handleExportCSV = () => {
    if (dailySummaries.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please fetch or filter some data before exporting.",
        variant: "destructive",
      });
      return;
    }
    const headers = "Date,Total Hours\n";
    const csvRows = dailySummaries.map(summary =>
      `${summary.date},${summary.totalHours.toFixed(2)}`
    );
    const csvString = headers + csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `clockheat_summary_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Your data has been downloaded as a CSV file.",
      });
    } else {
       toast({
          title: "Export Failed",
          description: "Your browser doesn't support direct CSV downloads.",
          variant: "destructive",
      });
    }
  };

  const fetchDetailedEntriesForDay = async (date: Date) => {
    if (!currentUser || !currentFilters.workspaceId) return;
    setIsLoadingDetailedEntries(true);
    setDetailedEntriesError(null);
    setDetailedTimeEntries([]);

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    try {
      const entries = await getClockifyTimeEntries({
        workspaceId: currentFilters.workspaceId,
        userId: currentUser.id,
        startDate: dayStart,
        endDate: dayEnd,
        projectId: currentFilters.projectId, 
      });
      setDetailedTimeEntries(entries);
    } catch (err) {
      console.error("Failed to fetch detailed time entries:", err);
      setDetailedEntriesError(err instanceof Error ? err.message : "Failed to load detailed entries.");
    } finally {
      setIsLoadingDetailedEntries(false);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayForModal(date);
    setIsDetailModalOpen(true);
    fetchDetailedEntriesForDay(date);
  };

  if (showApiKeyForm) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <ClockHeatLogoIcon className="mx-auto h-16 w-16 mb-6" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Welcome to ClockHeat
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Visualize your Clockify work patterns, gain insights, and optimize your productivity.
            Connect your Clockify account by entering your API key below.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <ApiKeyForm
            onApiKeySubmit={handleApiKeySubmit}
            currentApiKey={userApiKey}
            error={apiKeyFormError}
            onInputChange={() => setApiKeyFormError(null)}
          />
        </div>
      </div>
    );
  }

  if (isLoadingUser && !currentUser && !apiKeyFormError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-lg">Loading your Clockify information...</p>
        <p className="text-sm text-muted-foreground">Verifying API Key and fetching user data.</p>
      </div>
    );
  }

   if (userApiKey && !currentUser && !showApiKeyForm && (error || apiKeyFormError)) {
     return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Alert variant="destructive" className="max-w-md mb-4">
            <AlertTitle>Loading Failed</AlertTitle>
            <AlertDescription>{error || apiKeyFormError || "Unable to load your Clockify details. Please check your API key in settings or network."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => fetchAllClockifyData(userApiKey)}>Retry Loading Data</Button>
        <Link href="/settings" passHref>
          <Button variant="link" className="mt-2">Go to Settings to check API Key</Button>
        </Link>
      </div>
    );
  }

  const isContentLoading = isLoadingWorkspaces || isLoadingProjects || isLoadingTimeEntries || isLoadingUser;

  return (
    <div className="space-y-6">
      {currentUser && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-2xl font-semibold">
            Welcome, {currentUser.name}!
          </h2>
          <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isContentLoading || dailySummaries.length === 0 || !currentUser}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </div>
      )}

      {error && !apiKeyFormError && ( 
        <Alert variant="destructive">
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentUser && ( 
         <DataFilters
            workspaces={workspaces}
            projects={projects}
            isLoadingWorkspaces={isLoadingWorkspaces}
            isLoadingProjects={isLoadingProjects}
            selectedWorkspaceId={currentFilters.workspaceId}
            selectedProjectId={currentFilters.projectId}
            dateRange={currentFilters.dateRange}
            onFiltersChange={handleFiltersChange}
            disabled={!userApiKey || isLoadingUser || isLoadingWorkspaces || isLoadingProjects || isLoadingTimeEntries}
        />
      )}

      {isContentLoading && currentUser ? (
        <>
          <HeatmapCalendarSkeleton />
          <SummaryStatsSkeleton />
        </>
      ) : (
        <>
          {currentUser && effectiveGridStartDate && effectiveGridEndDate && (
             <HeatmapCalendar
                data={heatmapDataForCalendar}
                gridDisplayStartDate={effectiveGridStartDate}
                gridDisplayEndDate={effectiveGridEndDate}
                activeRangeStartDate={currentFilters.dateRange.from}
                activeRangeEndDate={currentFilters.dateRange.to}
                onDayClick={handleDayClick}
              />
          )}
          {!error && !apiKeyFormError && dailySummaries.length === 0 && currentUser && !isLoadingTimeEntries && (
              <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center bg-card rounded-lg shadow-md border border-border">
                <Inbox className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">No Activity Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  We couldn't find any time entries for the selected period or filters.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting the date range or project filters above to see your data,
                  or ensure you have tracked time in Clockify for this period.
                </p>
              </div>
          )}
          {((dailySummaries.length > 0 || (summaryStatsData.projectHoursBreakdown && summaryStatsData.projectHoursBreakdown.length > 0)) && currentUser) && (
            <SummaryStats
                totalHours={summaryStatsData.totalHours}
                averageDailyHours={summaryStatsData.averageDailyHours}
                mostProductiveDay={summaryStatsData.mostProductiveDay}
                projectHoursBreakdown={summaryStatsData.projectHoursBreakdown}
            />
          )}
        </>
      )}

      {currentUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalProgressCard 
                key={goalUpdateKey} 
                currentUser={currentUser} 
                workspaceId={currentFilters.workspaceId} 
            />
            <GoalSettingsCard onGoalUpdated={() => setGoalUpdateKey(prev => prev + 1)} />
        </div>
      )}

       {!showApiKeyForm && currentUser && (
          <AIInsightsForm
            rawTimeEntries={rawTimeEntries} 
            projectsForSelection={projects} 
            currentDateRange={currentFilters.dateRange} 
            dashboardSelectedProjectId={currentFilters.projectId} 
          />
        )}

      {selectedDayForModal && (
        <DetailedTimeEntriesModal
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          selectedDate={selectedDayForModal}
          entries={detailedTimeEntries}
          isLoading={isLoadingDetailedEntries}
          error={detailedEntriesError}
          projects={projects} 
        />
      )}
    </div>
  );
}

    