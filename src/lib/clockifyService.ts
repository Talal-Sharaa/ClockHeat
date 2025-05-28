
// @ts-nocheck
// TODO: Remove @ts-nocheck once API calls are fully implemented and typed, and pagination is handled robustly.
'use client'; 

import type { ClockifyWorkspace, ClockifyProject, ClockifyTimeEntry, ClockifyUser, DailyTimeSummary } from '@/types';
import { addDays, differenceInSeconds, format, parseISO, startOfDay } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_CLOCKIFY_API_URL || 'https://api.clockify.me/api/v1';
const LOCAL_STORAGE_API_KEY = 'clockify_user_api_key';

let currentApiKey: string | null = null;

/**
 * Sets the API key to be used for Clockify API requests.
 * This key is prioritized over any environment variable fallback.
 * @param key The Clockify API key, or null to clear it.
 */
export function setClockifyApiKey(key: string | null): void {
  currentApiKey = key;
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_API_KEY);
    }
  }
}

/**
 * Retrieves the currently set API key.
 * Tries to load from localStorage if not already set in the session.
 * @returns The API key string, or null if not set.
 */
export function getClockifyApiKey(): string | null {
  if (currentApiKey) {
    return currentApiKey;
  }
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedKey) {
      currentApiKey = storedKey;
      return currentApiKey;
    }
  }
  return null; 
}


/**
 * Generic fetch function for Clockify API.
 * Throws an error if API_KEY is missing or if the API returns an error.
 * @param endpoint - The API endpoint (e.g., '/user').
 * @param options - Standard Fetch API options.
 * @returns The JSON response from the API.
 */
async function clockifyFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKeyToUse = getClockifyApiKey();

  if (!apiKeyToUse) {
    const errorMessage = "Clockify API Key is not set. Please enter your API key via the form.";
    throw new Error(errorMessage);
  }
  
  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json',
    'X-Api-Key': apiKeyToUse,
  };
  
  if (!API_BASE_URL) {
    const errorMessage = "Clockify API base URL is not configured. Check NEXT_PUBLIC_CLOCKIFY_API_URL in your .env file.";
    throw new Error(errorMessage);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText, code: response.status };
    }
    const errorMessage = `Clockify API Error (${response.status} - Code: ${errorData?.code || 'N/A'}) for endpoint ${endpoint}: ${errorData?.message || 'Unknown error'}`;
    console.error(errorMessage, "Full error details:", errorData); 
    
    if (response.status === 401 || response.status === 403) {
        console.warn("Clockify authentication/authorization error. Your API Key might be invalid, or lack permissions.");
        setClockifyApiKey(null); 
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) { 
    return null; 
  }
  try {
    return await response.json();
  } catch (e) {
    console.error(`Clockify API: Failed to parse JSON response from ${fullUrl}`, e);
    throw new Error(`Clockify API: Invalid JSON response from ${fullUrl}`);
  }
}

// --- Service Functions ---

export async function getCurrentClockifyUser(): Promise<ClockifyUser> {
  try {
    const user = await clockifyFetch('/user');
    if (!user) throw new Error("Received null or empty response for Clockify user.");
    return user;
  } catch (error) {
    console.error("Failed to fetch current user from Clockify API:", error);
    throw error; 
  }
}


export async function getClockifyWorkspaces(): Promise<ClockifyWorkspace[]> {
  try {
    const workspaces = await clockifyFetch('/workspaces');
    return workspaces || [];
  } catch (error) {
    console.error("Failed to fetch workspaces from Clockify API:", error);
    throw error;
  }
}

export async function getClockifyProjects(workspaceId: string): Promise<ClockifyProject[]> {
  if (!workspaceId) {
    console.warn("getClockifyProjects called without workspaceId. Returning empty array.");
    return Promise.resolve([]);
  }
  try {
    // Increased page-size for projects, ensure pagination if you have more.
    // For projects, pagination is less common to hit max, but good practice.
    // For simplicity here, we assume one large page is enough.
    // If you have >500 projects, pagination would be needed here too.
    const projects = await clockifyFetch(`/workspaces/${workspaceId}/projects?page-size=500&archived=false`); 
    return projects || [];
  } catch (error) {
    console.error(`Failed to fetch projects for workspace ${workspaceId} from Clockify API:`, error);
    throw error;
  }
}

export async function getClockifyTimeEntries(params: {
  workspaceId: string;
  userId: string; 
  startDate: Date;
  endDate: Date;
  projectId?: string;
}): Promise<ClockifyTimeEntry[]> {
  const { workspaceId, userId, startDate, endDate, projectId } = params;

  const startISO = startDate.toISOString();
  const endISODate = new Date(endDate); 
  endISODate.setHours(23, 59, 59, 999); 
  const endISO = endISODate.toISOString();

  let allEntries: ClockifyTimeEntry[] = [];
  let page = 1;
  const pageSize = 1000; // Clockify's max page size for time entries can be up to 1000. Adjust if needed.
  let hasMorePages = true;

  console.log(`Fetching time entries from ${startISO} to ${endISO}`);

  while (hasMorePages) {
    let endpoint = `/workspaces/${workspaceId}/user/${userId}/time-entries?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&page=${page}&page-size=${pageSize}&hydrated=true`;
    
    if (projectId && projectId !== "_all_") { 
      endpoint += `&project=${encodeURIComponent(projectId)}`;
    }
    
    try {
      console.log(`Fetching page ${page} from endpoint: ${endpoint}`);
      const fetchedPageEntries: ClockifyTimeEntry[] = await clockifyFetch(endpoint);
      
      if (fetchedPageEntries && fetchedPageEntries.length > 0) {
        allEntries = allEntries.concat(fetchedPageEntries);
        console.log(`Fetched ${fetchedPageEntries.length} entries on page ${page}. Total so far: ${allEntries.length}`);
        if (fetchedPageEntries.length < pageSize) {
          // We fetched less than a full page, so this must be the last page.
          hasMorePages = false;
        } else {
          page++; // Prepare to fetch the next page
        }
      } else {
        // No entries returned on this page, so we're done.
        hasMorePages = false;
        console.log(`No more entries found on page ${page}.`);
      }
    } catch (error) {
      console.error(`Failed to fetch page ${page} of time entries from Clockify API:`, error);
      // Depending on desired behavior, you might want to re-throw or break the loop.
      // For now, we'll break and return what we have so far.
      throw error; // Re-throw to let the caller handle it.
    }
  }
  
  console.log(`Finished fetching. Total time entries retrieved: ${allEntries.length}`);
  return allEntries;
}

// --- Data Processing ---
export function processTimeEntriesForDailySummary(
  timeEntries: ClockifyTimeEntry[],
  startDate: Date, 
  endDate: Date   
): DailyTimeSummary[] {
  const dailySummariesMap: { [key: string]: number } = {}; 

  timeEntries.forEach(entry => {
    if (!entry.timeInterval || !entry.timeInterval.start) return; 

    let durationSeconds = 0;
    const entryStartDate = parseISO(entry.timeInterval.start);

    if (entry.timeInterval.end) { 
      const startTime = parseISO(entry.timeInterval.start);
      const endTime = parseISO(entry.timeInterval.end);
      durationSeconds = differenceInSeconds(endTime, startTime);
    } else if (entry.timeInterval.duration) { 
      // ISO 8601 duration format like "PT1H30M5S"
      const durationMatch = entry.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0');
        const minutes = parseInt(durationMatch[2] || '0');
        const seconds = parseInt(durationMatch[3] || '0');
        durationSeconds = (hours * 3600) + (minutes * 60) + seconds;
      }
    }
    
    if (durationSeconds > 0) {
      // Ensure the entry's date is within the requested range (mainly for entries spanning midnight)
      // For simplicity, we'll use the start date of the entry.
      // More complex logic would be needed if an entry starts before startDate but ends within it.
      const entryDateOnly = startOfDay(entryStartDate);
      if (entryDateOnly >= startOfDay(startDate) && entryDateOnly <= startOfDay(endDate)) {
        const entryDateStr = format(entryStartDate, 'yyyy-MM-dd'); 
        dailySummariesMap[entryDateStr] = (dailySummariesMap[entryDateStr] || 0) + (durationSeconds / 3600); 
      }
    }
  });

  const result: DailyTimeSummary[] = [];
  let currentDatePointer = startOfDay(startDate); 
  const finalEndDate = startOfDay(endDate); 
  
  while (currentDatePointer <= finalEndDate) {
    const dateStr = format(currentDatePointer, 'yyyy-MM-dd'); 
    result.push({
      date: dateStr,
      totalHours: parseFloat((dailySummariesMap[dateStr] || 0).toFixed(2)), 
    });
    currentDatePointer = addDays(currentDatePointer, 1);
  }
  return result;
}

