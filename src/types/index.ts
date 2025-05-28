
// Existing types - will be replaced or augmented by Clockify-specific types
// export type Workspace = {
//   id: string;
//   name: string;
// };

// export type Project = {
//   id: string;
//   name: string;
//   workspaceId: string;
// };

export type HeatmapDataPoint = {
  date: Date;
  count: number; // e.g., hours worked, tasks completed, etc.
};

export type TimeEntry = { // This is for the AI Form, may differ from Clockify's raw TimeEntry
  date: string; // YYYY-MM-DD
  totalHours: number;
};

// --- Clockify Specific Types ---

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  profilePicture: string;
  // Add other fields as needed
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
  hourlyRate?: { amount: number; currency: string };
  memberships?: any[]; // Define further if needed
  workspaceSettings?: {
    trackTimeDownToSecond: boolean;
    // Add other settings
  };
  imageUrl?: string;
  featureSubscriptionType?: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  hourlyRate?: { amount: number; currency: string } | null;
  clientId: string;
  clientName?: string; // Often included for convenience
  workspaceId: string;
  billable: boolean;
  memberships?: any[]; // Define further
  color: string;
  archived: boolean;
  note?: string;
  public: boolean; // Whether project is public or private
  // Add other fields like estimate, timeEstimate, budgetEstimate etc.
}

export interface ClockifyTimeInterval {
  start: string; // ISO 8601 date-time string
  end: string | null; // ISO 8601 date-time string, or null if timer is running
  duration: string | null; // ISO 8601 duration string (e.g., "PT1H30M5S"), or null if timer is running
}

export interface ClockifyTag {
  id: string;
  name: string;
  workspaceId: string;
  archived: boolean;
}

export interface ClockifyTask {
  id: string;
  name: string;
  projectId: string;
  // Add other task fields if needed
}

export interface ClockifyTimeEntry {
  id: string;
  description: string;
  userId: string;
  billable: boolean;
  projectId: string | null; // Can be null if entry is not associated with a project
  project?: Pick<ClockifyProject, 'id' | 'name' | 'color'> | null; // Included when hydrated
  taskId: string | null; // Can be null
  task?: Pick<ClockifyTask, 'id' | 'name'> | null; // Included when hydrated
  timeInterval: ClockifyTimeInterval;
  workspaceId: string;
  tags: ClockifyTag[];
  tagIds?: string[]; // Sometimes only IDs are present if not fully hydrated for tags
  // Add other fields as needed, e.g., customFields
}

// For storing processed daily summaries from ClockifyTimeEntry[]
export interface DailyTimeSummary {
  date: string; // YYYY-MM-DD
  totalHours: number;
}

// For project breakdown in SummaryStats
export interface ProjectHours {
  projectId: string;
  projectName: string;
  totalHours: number;
}

// Type for summary stats data passed to the component
export interface SummaryStatsData {
  totalHours: number;
  averageDailyHours: number;
  mostProductiveDay: string;
  projectHoursBreakdown?: ProjectHours[];
}

// --- Goal Setting Types ---
export type GoalType = 'weekly' | 'monthly';

export interface Goal {
  id: string; // Unique identifier for the goal
  name: string; // User-defined name for the goal
  type: GoalType;
  hours: number;
  customPeriodStart?: string | null; // ISO date string
  customPeriodEnd?: string | null;   // ISO date string
}

export interface GoalProgressData extends Goal {
  trackedHours: number;
  periodStart: Date;
  periodEnd: Date;
  isLoading: boolean; // Loading state for this specific goal's data
  error?: string | null; // Error state for this specific goal's data
}

