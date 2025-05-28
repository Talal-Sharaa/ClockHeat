
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function HeatmapCalendarSkeleton() {
  const numberOfWeeks = 53; // Approximate number of weeks for a full year
  const daysInWeek = 7;

  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" /> {/* Title Skeleton */}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full">
            {/* Month Labels Skeleton */}
            <div className="grid grid-flow-col gap-x-[3px] sm:gap-x-1 mb-1 pl-[30px] sm:pl-[36px]" style={{ gridTemplateColumns: `repeat(${numberOfWeeks}, minmax(0, 1fr))` }}>
              {[...Array(12)].map((_, i) => (
                <div key={`month-skel-${i}`} style={{ gridColumnStart: Math.max(1, Math.floor(i * (numberOfWeeks / 12)) + 1) }}>
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>

            <div className="flex gap-x-[3px] sm:gap-x-1">
              {/* Day Labels Skeleton */}
              <div className="flex flex-col gap-[3px] sm:gap-1 mr-1 sm:mr-2 pt-[3px] sm:pt-[4px] w-[24px] sm:w-[28px] shrink-0">
                {[...Array(daysInWeek)].map((_, i) => (
                  <div key={`day-label-skel-${i}`} className="h-4 sm:h-5 flex items-center justify-end pr-1">
                    {(i === 1 || i === 3 || i === 5) ? <Skeleton className="h-3 w-2" /> : <div className="h-3 w-2" />}
                  </div>
                ))}
              </div>

              {/* Heatmap Grid Skeleton */}
              <div className="grid grid-flow-col gap-[3px] sm:gap-1">
                {[...Array(numberOfWeeks)].map((_, weekIndex) => (
                  <div key={`week-skel-${weekIndex}`} className="grid grid-rows-7 gap-[3px] sm:gap-1">
                    {[...Array(daysInWeek)].map((_, dayIndex) => (
                      <Skeleton key={`cell-skel-${weekIndex}-${dayIndex}`} className="h-4 w-4 sm:h-5 sm:w-5 rounded-sm" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Legend Skeleton */}
        <div className="mt-4 flex flex-wrap justify-end items-center gap-x-3 sm:gap-x-4 gap-y-1">
          <Skeleton className="h-3 w-8" /> {/* "Less" */}
          {[...Array(6)].map((_, i) => (
            <Skeleton key={`legend-item-skel-${i}`} className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm" />
          ))}
          <Skeleton className="h-3 w-8" /> {/* "More" */}
        </div>
      </CardContent>
    </Card>
  );
}
