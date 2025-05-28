
import type { HeatmapDataPoint } from '@/types';
import { ClockifyWorkspace, ClockifyProject } from '@/types';
import { subDays, format, eachDayOfInterval, startOfYear, endOfYear, getDay, getMonth } from 'date-fns';

export const MOCK_WORKSPACES: ClockifyWorkspace[] = [
  { id: 'ws1', name: 'Personal Tasks (Mock)', imageUrl: 'https://placehold.co/40x40.png?text=P' },
  { id: 'ws2', name: 'Client Alpha (Mock)', imageUrl: 'https://placehold.co/40x40.png?text=CA' },
  { id: 'ws3', name: 'Side Hustle Inc. (Mock)', imageUrl: 'https://placehold.co/40x40.png?text=SH' },
];

export const MOCK_PROJECTS: ClockifyProject[] = [
  { id: 'proj1', name: 'Core Development (Mock)', workspaceId: 'ws2', clientId: 'client1', billable: true, color: '#FF5733', archived: false, public: true },
  { id: 'proj2', name: 'UI Design (Mock)', workspaceId: 'ws2', clientId: 'client1', billable: true, color: '#33FF57', archived: false, public: true },
  { id: 'proj3', name: 'Marketing Campaign (Mock)', workspaceId: 'ws3', clientId: 'client2', billable: false, color: '#3357FF', archived: false, public: true },
  { id: 'proj4', name: 'Learning new tech (Mock)', workspaceId: 'ws1', clientId: 'client3', billable: false, color: '#FF33A1', archived: false, public: true },
];

// HEATMAP_COLOR_SCALE now uses CSS variables derived from the theme's primary color
// These CSS variables (--primary-h, --primary-s, --primary-l) will be set by ThemeProvider
export const HEATMAP_COLOR_SCALE: string[] = [
  'bg-muted',                                                  // Level 0 (0 hrs) - Theme's muted color
  'bg-[hsl(var(--primary-h)_var(--primary-s)_90%)]',             // Level 1 (>0 to 2 hrs) - Very light primary
  'bg-[hsl(var(--primary-h)_var(--primary-s)_80%)]',             // Level 2 (>2 to 4 hrs) - Light primary
  'bg-[hsl(var(--primary-h)_var(--primary-s)_70%)]',             // Level 3 (>4 to 6 hrs) - Medium primary
  'bg-primary',                                                  // Level 4 (>6 to 8 hrs) - Theme's actual primary color
  'bg-[hsl(var(--primary-h)_var(--primary-s)_calc(var(--primary-l)_-_10%))]', // Level 5 (>8 hrs) - Darker primary
];

export const HEATMAP_LEGEND_ITEMS = [
  { label: '0 hrs', colorClass: HEATMAP_COLOR_SCALE[0] },
  { label: '1-2 hrs', colorClass: HEATMAP_COLOR_SCALE[1] },
  { label: '3-4 hrs', colorClass: HEATMAP_COLOR_SCALE[2] },
  { label: '5-6 hrs', colorClass: HEATMAP_COLOR_SCALE[3] },
  { label: '7-8 hrs', colorClass: HEATMAP_COLOR_SCALE[4] },
  { label: '> 8 hrs', colorClass: HEATMAP_COLOR_SCALE[5] },
];


export const getCalendarYearData = (year: number = new Date().getFullYear()): HeatmapDataPoint[] => {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 11, 31));
  const daysInYear = eachDayOfInterval({ start: startDate, end: endDate });

  return daysInYear.map(date => {
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let count;
    if (isWeekend) {
      count = Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0;
    } else {
      const randomFactor = Math.random();
      if (randomFactor < 0.1) count = 0;
      else if (randomFactor < 0.4) count = Math.floor(Math.random() * 3) + 1;
      else if (randomFactor < 0.8) count = Math.floor(Math.random() * 3) + 4;
      else count = Math.floor(Math.random() * 3) + 7;
    }
    return {
      date,
      count,
    };
  });
};


export const getHeatmapCellColor = (count: number): string => {
  if (count <= 0) return HEATMAP_COLOR_SCALE[0];
  if (count <= 2) return HEATMAP_COLOR_SCALE[1];
  if (count <= 4) return HEATMAP_COLOR_SCALE[2];
  if (count <= 6) return HEATMAP_COLOR_SCALE[3];
  if (count <= 8) return HEATMAP_COLOR_SCALE[4];
  return HEATMAP_COLOR_SCALE[5];
};

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
