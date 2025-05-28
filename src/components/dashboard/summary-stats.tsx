
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Clock, Activity, Briefcase } from "lucide-react";
import type { ProjectHours } from "@/types";

interface SummaryStatsProps {
  totalHours: number;
  averageDailyHours: number;
  mostProductiveDay?: string;
  projectHoursBreakdown?: ProjectHours[];
}

const MAX_PROJECTS_TO_DISPLAY = 5;

export function SummaryStats({
  totalHours,
  averageDailyHours,
  mostProductiveDay = "N/A",
  projectHoursBreakdown,
}: SummaryStatsProps) {
  const showProjectBreakdown = projectHoursBreakdown && projectHoursBreakdown.length > 0;

  let topProjects: ProjectHours[] = [];
  let otherProjectsHours = 0;
  let otherProjectsCount = 0;

  if (showProjectBreakdown) {
    if (projectHoursBreakdown.length > MAX_PROJECTS_TO_DISPLAY) {
      topProjects = projectHoursBreakdown.slice(0, MAX_PROJECTS_TO_DISPLAY);
      otherProjectsCount = projectHoursBreakdown.length - MAX_PROJECTS_TO_DISPLAY;
      otherProjectsHours = projectHoursBreakdown
        .slice(MAX_PROJECTS_TO_DISPLAY)
        .reduce((sum, p) => sum + p.totalHours, 0);
    } else {
      topProjects = projectHoursBreakdown;
    }
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${showProjectBreakdown ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hours Tracked</CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHours.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Across selected period
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Daily Hours</CardTitle>
          <Clock className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageDailyHours.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Based on tracked days
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Productive Day</CardTitle>
          <Activity className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mostProductiveDay}</div>
           <p className="text-xs text-muted-foreground">
            Typically highest activity
          </p>
        </CardContent>
      </Card>

      {showProjectBreakdown && (
        <Card className="shadow-lg lg:col-span-1 md:col-span-2"> {/* Adjust colspan for responsiveness */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Hours Breakdown</CardTitle>
            <Briefcase className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {topProjects.length > 0 ? (
              <ScrollArea className="h-[100px] pr-3"> {/* Max height for scrollability */}
                <ul className="space-y-1 text-sm">
                  {topProjects.map((proj) => (
                    <li key={proj.projectId} className="flex justify-between">
                      <span className="truncate max-w-[70%]" title={proj.projectName}>{proj.projectName}</span>
                      <span className="font-medium">{proj.totalHours.toFixed(1)} hrs</span>
                    </li>
                  ))}
                  {otherProjectsCount > 0 && (
                    <li className="flex justify-between text-muted-foreground">
                      <span>Other ({otherProjectsCount} projects)</span>
                      <span className="font-medium">{otherProjectsHours.toFixed(1)} hrs</span>
                    </li>
                  )}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">No project data available for this period.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
