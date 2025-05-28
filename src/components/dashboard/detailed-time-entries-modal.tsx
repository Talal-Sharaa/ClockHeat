
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Info } from "lucide-react";
import type { ClockifyTimeEntry, ClockifyProject } from "@/types";
import { format, parseISO, differenceInSeconds } from "date-fns";

interface DetailedTimeEntriesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  entries: ClockifyTimeEntry[];
  isLoading: boolean;
  error: string | null;
  projects: ClockifyProject[]; // To map project ID to name if not hydrated
}

const formatDuration = (start: string, end: string | null, durationStr: string | null): string => {
  if (end) {
    const durationSec = differenceInSeconds(parseISO(end), parseISO(start));
    const hours = Math.floor(durationSec / 3600);
    const minutes = Math.floor((durationSec % 3600) / 60);
    const seconds = durationSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  if (durationStr) { // Format ISO duration PT1H30M5S
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  return "N/A";
};

const getProjectName = (projectId: string | null, projectsList: ClockifyProject[], hydratedProject?: Pick<ClockifyProject, 'id' | 'name' | 'color'> | null): string => {
  if (hydratedProject?.name) return hydratedProject.name;
  if (!projectId) return "No Project";
  const project = projectsList.find(p => p.id === projectId);
  return project?.name || "Unknown Project";
};

const getProjectColor = (projectId: string | null, projectsList: ClockifyProject[], hydratedProject?: Pick<ClockifyProject, 'id' | 'name' | 'color'> | null): string => {
    if (hydratedProject?.color) return hydratedProject.color;
    if (!projectId) return '#808080'; // Default grey for no project
    const project = projectsList.find(p => p.id === projectId);
    return project?.color || '#808080';
}

export function DetailedTimeEntriesModal({
  isOpen,
  onOpenChange,
  selectedDate,
  entries,
  isLoading,
  error,
  projects,
}: DetailedTimeEntriesModalProps) {
  if (!isOpen || !selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Time Entries for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of your tracked time for the selected day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-1"> {/* Added pr-1 for scrollbar space */}
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading entries...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Error loading entries</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!isLoading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p>No time entries found for this day.</p>
            </div>
          )}
          {!isLoading && !error && entries.length > 0 && (
            <ScrollArea className="h-[calc(90vh-200px)]"> {/* Adjust height as needed */}
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[35%]">Description</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium break-words">
                        {entry.description || <span className="italic text-muted-foreground">No description</span>}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center">
                           <span
                            className="mr-2 h-2.5 w-2.5 rounded-full inline-block"
                            style={{ backgroundColor: getProjectColor(entry.projectId, projects, entry.project) }}
                           />
                           {getProjectName(entry.projectId, projects, entry.project)}
                        </span>
                      </TableCell>
                      <TableCell>{format(parseISO(entry.timeInterval.start), "HH:mm:ss")}</TableCell>
                      <TableCell>
                        {entry.timeInterval.end
                          ? format(parseISO(entry.timeInterval.end), "HH:mm:ss")
                          : <span className="italic text-muted-foreground">Running</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDuration(entry.timeInterval.start, entry.timeInterval.end, entry.timeInterval.duration)}
                      </TableCell>
                      <TableCell>
                        {entry.tags && entry.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag) => (
                              <Badge key={tag.id} variant="secondary" className="text-xs">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground text-xs">No tags</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
