
"use client";

import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { suggestOptimalWorkPatterns, type SuggestOptimalWorkPatternsInput, type SuggestOptimalWorkPatternsOutput } from "@/ai/flows/suggest-optimal-work-patterns";
import type { DailyTimeSummary, ClockifyProject, ClockifyTimeEntry } from "@/types";
import { processTimeEntriesForDailySummary } from "@/lib/clockifyService"; // Import the processing function

const ALL_PROJECTS_VALUE = "_all_";

// Form schema is simple as data generation is handled by effects
const formSchema = z.object({});
type FormData = z.infer<typeof formSchema>;

interface AIInsightsFormProps {
  rawTimeEntries?: ClockifyTimeEntry[];
  projectsForSelection?: ClockifyProject[];
  currentDateRange?: { from: Date; to: Date };
  dashboardSelectedProjectId?: string; // Project selected in main dashboard filters
}

const generateJsonForAI = (
  entries: ClockifyTimeEntry[] | undefined,
  dateRange: { from: Date; to: Date } | undefined,
  selectedProjectIdForAI: string,
  allProjects: ClockifyProject[] | undefined
): string => {
  if (!entries || !dateRange) {
    // Generate sample if no real data
    const today = new Date();
    const sampleEntries = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (7 - i));
      return {
        date: date.toISOString().split('T')[0],
        totalHours: Math.floor(Math.random() * 8) + 1,
      };
    });
    return JSON.stringify(sampleEntries, null, 2);
  }

  let entriesToProcess = entries;
  if (selectedProjectIdForAI !== ALL_PROJECTS_VALUE && allProjects) {
    entriesToProcess = entries.filter(entry => entry.projectId === selectedProjectIdForAI);
  }

  const dailySummaries = processTimeEntriesForDailySummary(entriesToProcess, dateRange.from, dateRange.to);
  return JSON.stringify(dailySummaries.map(s => ({ date: s.date, totalHours: s.totalHours })), null, 2);
};

export function AIInsightsForm({
  rawTimeEntries,
  projectsForSelection = [],
  currentDateRange,
  dashboardSelectedProjectId,
}: AIInsightsFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<SuggestOptimalWorkPatternsOutput | null>(null);
  const [jsonDataForAI, setJsonDataForAI] = React.useState<string>("");
  const [selectedProjectForAI, setSelectedProjectForAI] = React.useState<string>(dashboardSelectedProjectId || ALL_PROJECTS_VALUE);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  React.useEffect(() => {
    // Initialize or update selectedProjectForAI if dashboardSelectedProjectId changes
    setSelectedProjectForAI(dashboardSelectedProjectId || ALL_PROJECTS_VALUE);
  }, [dashboardSelectedProjectId]);

  React.useEffect(() => {
    setJsonDataForAI(generateJsonForAI(rawTimeEntries, currentDateRange, selectedProjectForAI, projectsForSelection));
  }, [rawTimeEntries, currentDateRange, selectedProjectForAI, projectsForSelection]);

  const onSubmit: SubmitHandler<FormData> = async (_data) => {
    if (!jsonDataForAI) {
      setError("No time tracking data available to analyze.");
      return;
    }
    try {
      const parsed = JSON.parse(jsonDataForAI);
      if (!Array.isArray(parsed)) throw new Error("Data must be an array.");
      // Allow empty array for JSON structure validation
      if (parsed.length > 0 && !parsed.every(item => typeof item.date === 'string' && typeof item.totalHours === 'number')) {
        throw new Error("Invalid JSON structure. Expected an array of objects like [{ \"date\": \"YYYY-MM-DD\", \"totalHours\": 8 }].");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error parsing JSON.";
      setError(`Invalid JSON data: ${message}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setInsights(null);

    try {
      const input: SuggestOptimalWorkPatternsInput = {
        timeTrackingData: jsonDataForAI,
      };
      const result = await suggestOptimalWorkPatterns(input);
      setInsights(result);
    } catch (e: any) {
      console.error("Error fetching AI insights:", e);
      let errorMessage = "An unknown error occurred while fetching AI insights.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string') {
        errorMessage += ` (Digest: ${e.digest}). Please check server logs.`;
      } else {
        errorMessage += " Please check server logs for more details.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateData = () => {
     setJsonDataForAI(generateJsonForAI(rawTimeEntries, currentDateRange, selectedProjectForAI, projectsForSelection));
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Sparkles className="mr-2 h-5 w-5 text-primary" />
          AI-Powered Work Pattern Insights
        </CardTitle>
        <CardDescription>
          Optionally select a project, then review or modify time-tracking data (JSON) to get personalized suggestions.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormItem>
              <FormLabel htmlFor="aiProjectSelect">Analyze Project (Optional)</FormLabel>
              <Select
                value={selectedProjectForAI}
                onValueChange={setSelectedProjectForAI}
                disabled={!projectsForSelection || projectsForSelection.length === 0}
              >
                <SelectTrigger id="aiProjectSelect">
                  <SelectValue placeholder="Select Project for AI Analysis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROJECTS_VALUE}>All Projects (based on main filters)</SelectItem>
                  {projectsForSelection.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <FormDescription>
                Select a specific project to analyze its data, or choose "All Projects".
              </FormDescription>
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="timeTrackingDataJson">Time-Tracking Data (JSON for AI)</FormLabel>
              <FormControl>
                <Textarea
                  id="timeTrackingDataJson"
                  placeholder='[{"date": "2023-10-01", "totalHours": 6}, {"date": "2023-10-02", "totalHours": 8}]'
                  className="min-h-[150px] resize-y font-mono text-sm"
                  value={jsonDataForAI}
                  onChange={(e) => setJsonDataForAI(e.target.value)}
                />
              </FormControl>
              <FormDescription>
                This data is generated based on your project selection above. Each object should have &quot;date&quot; (YYYY-MM-DD) and &quot;totalHours&quot; (number).
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="p-0 h-auto ml-2"
                  onClick={handleRecalculateData}
                >
                  {rawTimeEntries && rawTimeEntries.length > 0 ? "Recalculate data for AI" : "Load sample data"}
                </Button>
              </FormDescription>
               <FormMessage />
            </FormItem>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-4">
            <Button type="submit" disabled={isLoading || !jsonDataForAI} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Get Insights"
              )}
            </Button>

            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {insights && !error && (
              <Alert className="w-full bg-primary/5 border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary">Your Personalized Insights</AlertTitle>
                <AlertDescription>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {insights.insights}
                    </ReactMarkdown>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

